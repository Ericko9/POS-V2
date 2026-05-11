"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { RotateCcw, Plus } from "lucide-react"
import { formatRupiah, formatDateTime } from "@/lib/utils"

interface Retur {
  id: string; alasan: string; totalNilai: number; createdAt: string;
  nota: { nomorNota: string; namaPelanggan: string };
  items: { jumlah: number; kondisi: string; nilaiKembali: number; barang: { nama: string; grade: string } }[];
}

export default function ReturPage() {
  const [data, setData] = useState<Retur[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetch("/api/retur").then(r => r.json()).then(j => { if (j.success) setData(j.data); setLoading(false) }) }, [])

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="page-header">
        <div><h1 className="page-title flex items-center gap-2"><RotateCcw className="w-7 h-7 text-primary" /> Retur Barang</h1><p className="page-subtitle">{data.length} retur</p></div>
        <Link href="/retur/baru" className="btn-primary"><Plus className="w-4 h-4" /> Buat Retur</Link>
      </div>
      {loading ? <div className="card text-center py-12 text-muted">Memuat...</div> : data.length === 0 ? <div className="card text-center py-12 text-muted">Belum ada retur</div> : (
        <div className="space-y-4">
          {data.map(r => (
            <div key={r.id} className="card-hover">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Link href={`/nota/${r.nota.nomorNota}`} className="text-primary hover:underline font-mono text-sm">{r.nota.nomorNota}</Link>
                  <p className="text-sm text-muted-foreground">{r.nota.namaPelanggan} · {formatDateTime(r.createdAt)}</p>
                </div>
                <span className="font-bold text-warning">{formatRupiah(r.totalNilai)}</span>
              </div>
              <p className="text-sm mb-2"><span className="text-muted">Alasan:</span> {r.alasan}</p>
              <div className="flex flex-wrap gap-2">
                {r.items.map((item, i) => (
                  <span key={i} className={`badge ${item.kondisi === "BAGUS" ? "badge-success" : "badge-danger"}`}>
                    {item.barang.nama} × {item.jumlah} ({item.kondisi})
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
