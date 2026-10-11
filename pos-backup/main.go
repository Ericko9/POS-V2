// Command pos-backup dumps a PostgreSQL database and uploads it to S3-compatible
// storage (Cloudflare R2, MinIO, AWS S3), with a small dashboard to run and
// inspect backups.
package main

import (
	"bytes"
	"compress/gzip"
	"context"
	"embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

//go:embed web
var webFS embed.FS

// backup is one stored object in the bucket.
type backup struct {
	Name string    `json:"name"` // object key, also what -restore takes
	Size int64     `json:"size"` // compressed size in bytes
	When time.Time `json:"when"`
}

type status struct {
	Database string   `json:"database"`
	Running  bool     `json:"running"`
	LastRun  string   `json:"lastRun"`
	LastOK   bool     `json:"lastOk"`
	LastSize int64    `json:"lastSize"`
	LastErr  string   `json:"lastErr"`
	Backups  []backup `json:"backups"`
}

type app struct {
	s3     *s3.Client
	bucket string
	db     string
	// conn is passed to pg_dump/pg_restore as PG* env vars.
	conn []string

	mu    sync.RWMutex
	run   bool
	state status
}

func main() {
	var (
		addr    = flag.String("addr", envOr("ADDR", ":8080"), "listen address")
		bucket  = flag.String("bucket", os.Getenv("BACKUP_BUCKET"), "S3 bucket (default $BACKUP_BUCKET)")
		restore = flag.String("restore", "", "restore a backup by name, then exit")
	)
	flag.Parse()
	if *bucket == "" {
		log.Fatal("bucket required: -bucket NAME or set BACKUP_BUCKET")
	}

	a := &app{
		bucket: *bucket,
		db:     envOr("PGDATABASE", "pos_db"),
		conn:   pgEnv(),
	}

	ctx := context.Background()
	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(envOr("AWS_REGION", "us-east-1")),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			os.Getenv("AWS_ACCESS_KEY_ID"), os.Getenv("AWS_SECRET_ACCESS_KEY"), "")),
	)
	if err != nil {
		log.Fatal(err)
	}
	// MinIO and most S3-compatible stores need an explicit endpoint + path style.
	a.s3 = s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(os.Getenv("S3_ENDPOINT"))
		o.UsePathStyle = true
	})

	if *restore != "" {
		if err := a.restore(ctx, *restore); err != nil {
			log.Fatal(err)
		}
		fmt.Println("restored", *restore, "into", a.db)
		return
	}

	a.state.Database = a.db
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/status", a.handleStatus)
	mux.HandleFunc("POST /api/backup", a.handleBackup)
	mux.HandleFunc("POST /api/restore", a.handleRestore)
	mux.HandleFunc("GET /", a.handleIndex)

	log.Printf("dashboard on http://localhost%s (db %s, bucket %s)", *addr, a.db, *bucket)
	if err := http.ListenAndServe(*addr, mux); err != nil {
		log.Fatal(err)
	}
}

// Backup dumps the database, compresses it, uploads it, and records the result.
// Only one run happens at a time; a concurrent call is rejected rather than queued.
func (a *app) Backup(ctx context.Context) error {
	a.mu.Lock()
	if a.run {
		a.mu.Unlock()
		return errors.New("a backup is already running")
	}
	a.run = true
	a.state.Running = true
	a.mu.Unlock()

	defer func() {
		a.mu.Lock()
		a.run = false
		a.state.Running = false
		a.state.LastRun = time.Now().Format(time.RFC3339)
		a.mu.Unlock()
	}()

	raw, err := a.dump(ctx)
	if err != nil {
		a.fail(err)
		return err
	}
	body, err := gzipBytes(raw)
	if err != nil {
		a.fail(err)
		return err
	}
	name := fmt.Sprintf("%s-%s.sql.gz", a.db, time.Now().UTC().Format("20060102T150405Z"))

	if _, err := a.s3.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(a.bucket),
		Key:    aws.String(name),
		Body:   bytes.NewReader(body),
	}); err != nil {
		a.fail(err)
		return err
	}
	if _, err := a.s3.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(a.bucket)}); err != nil {
		log.Printf("warning: bucket %s not reachable after upload: %v", a.bucket, err)
	}

	a.mu.Lock()
	a.state.LastOK = true
	a.state.LastErr = ""
	a.state.LastSize = int64(len(body))
	a.mu.Unlock()
	a.refresh(ctx)
	return nil
}

// restore overwrites the database from a stored backup. Destructive by design.
func (a *app) restore(ctx context.Context, name string) error {
	if !strings.HasSuffix(name, ".sql.gz") {
		return fmt.Errorf("invalid backup name %q", name)
	}
	obj, err := a.s3.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(a.bucket), Key: aws.String(name)})
	if err != nil {
		return err
	}
	defer obj.Body.Close()

	raw, err := gunzipBytes(obj.Body)
	if err != nil {
		return err
	}
	cmd := exec.CommandContext(ctx, "pg_restore",
		"--clean", "--if-exists", "--no-owner", "--no-privileges", "--dbname", a.db)
	cmd.Env = a.conn
	cmd.Stdin = bytes.NewReader(raw)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("pg_restore: %w: %s", err, lastLine(string(out)))
	}
	log.Printf("restored %s (%d bytes raw)", name, len(raw))
	return nil
}

func (a *app) dump(ctx context.Context) ([]byte, error) {
	cmd := exec.CommandContext(ctx, "pg_dump", "--format=custom", "--no-owner", "--no-privileges", "--dbname", a.db)
	cmd.Env = a.conn
	var buf bytes.Buffer
	cmd.Stdout = &buf
	cmd.Stderr = &bytes.Buffer{}
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("pg_dump %s: %w", a.db, err)
	}
	if buf.Len() == 0 {
		return nil, fmt.Errorf("pg_dump %s produced an empty dump", a.db)
	}
	return buf.Bytes(), nil
}

// list reads the bucket and records what is stored there.
func (a *app) list(ctx context.Context) ([]backup, error) {
	out, err := a.s3.ListObjectsV2(ctx, &s3.ListObjectsV2Input{Bucket: aws.String(a.bucket)})
	if err != nil {
		return nil, err
	}
	var list []backup
	for _, o := range out.Contents {
		list = append(list, backup{Name: *o.Key, Size: aws.ToInt64(o.Size), When: aws.ToTime(o.LastModified)})
	}
	sort.Slice(list, func(i, j int) bool { return list[i].When.After(list[j].When) })
	return list, nil
}

func (a *app) refresh(ctx context.Context) {
	list, err := a.list(ctx)
	if err != nil {
		log.Printf("list: %v", err)
		return
	}
	a.mu.Lock()
	a.state.Backups = list
	a.mu.Unlock()
}

func (a *app) fail(err error) {
	log.Printf("backup failed: %v", err)
	a.mu.Lock()
	a.state.LastOK = false
	a.state.LastErr = err.Error()
	a.state.LastSize = 0
	a.mu.Unlock()
}

func (a *app) snapshot() status {
	a.mu.RLock()
	defer a.mu.RUnlock()
	s := a.state
	if s.Backups == nil {
		s.Backups = []backup{}
	}
	return s
}

// pgEnv builds the PG* environment for pg_dump/pg_restore, overriding anything
// inherited from the server process so the target database is unambiguous.
func pgEnv() []string {
	keys := []string{
		"PGHOST", "PGPORT", "PGUSER", "PGPASSWORD",
		"PGSSLMODE", "PGDATABASE", "PGCONNECT_TIMEOUT",
	}
	var env []string
	for _, k := range keys {
		if v := os.Getenv(k); v != "" {
			env = append(env, k+"="+v)
		}
	}
	return env
}

func gzipBytes(in []byte) ([]byte, error) {
	var buf bytes.Buffer
	zw, err := gzip.NewWriterLevel(&buf, gzip.BestSpeed)
	if err != nil {
		return nil, err
	}
	if _, err := zw.Write(in); err != nil {
		return nil, err
	}
	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func gunzipBytes(r io.Reader) ([]byte, error) {
	zr, err := gzip.NewReader(r)
	if err != nil {
		return nil, fmt.Errorf("download is not gzip: %w", err)
	}
	defer zr.Close()
	return io.ReadAll(zr)
}

func lastLine(s string) string {
	lines := strings.Split(strings.TrimSpace(s), "\n")
	if len(lines) == 0 {
		return s
	}
	return lines[len(lines)-1]
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func (a *app) writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encode: %v", err)
	}
}

func (a *app) handleIndex(w http.ResponseWriter, r *http.Request) {
	page, err := webFS.ReadFile("web/index.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write(page)
}

func (a *app) handleStatus(w http.ResponseWriter, r *http.Request) {
	a.mu.RLock()
	s := a.state
	a.mu.RUnlock()
	if !s.Running {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		a.refresh(ctx)
		cancel()
	}
	a.writeJSON(w, http.StatusOK, a.snapshot())
}

func (a *app) handleBackup(w http.ResponseWriter, r *http.Request) {
	// Run detached so the request context cannot cancel a dump mid-upload.
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
		defer cancel()
		if err := a.Backup(ctx); err != nil {
			log.Printf("backup: %v", err)
		}
	}()
	a.writeJSON(w, http.StatusAccepted, map[string]string{"status": "started"})
}

func (a *app) handleRestore(w http.ResponseWriter, r *http.Request) {
	name := r.FormValue("name")
	if name == "" {
		http.Error(w, "name required", http.StatusBadRequest)
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
		defer cancel()
		if err := a.restore(ctx, name); err != nil {
			log.Printf("restore %s: %v", name, err)
		}
	}()
	a.writeJSON(w, http.StatusAccepted, map[string]string{"status": "restoring " + name})
}
