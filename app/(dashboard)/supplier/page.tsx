"use client"
import { useState, useEffect } from "react"
import { Truck, Plus, Pencil, Trash2, X, Loader2, Eye } from "lucide-react"

interface Supplier { id: string; nama: string; alamat: string | null; noTelp: string | null; email: string | null; catatan: string | null; _count: { barang: number } }

export default function SupplierPage() {
  const [data, setData] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ nama: "", alamat: "", noTelp: "", email: "", catatan: "" })
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)

  const fetchData = async () => { setLoading(true); const r = await fetch("/api/supplier"); const j = await r.json(); if (j.success) setData(j.data); setLoading(false) }
  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const url = editId ? `/api/supplier/${editId}` : "/api/supplier"
    const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const json = await res.json()
    if (json.success) { setShowForm(false); setEditId(null); setForm({ nama: "", alamat: "", noTelp: "", email: "", catatan: "" }); fetchData() }
    else alert(json.message)
    setSaving(false)
  }

  const handleEdit = (s: Supplier) => { setEditId(s.id); setForm({ nama: s.nama, alamat: s.alamat || "", noTelp: s.noTelp || "", email: s.email || "", catatan: s.catatan || "" }); setShowForm(true) }

  const handleDelete = async (id: string) => { if (!confirm("Hapus supplier?")) return; const r = await fetch(`/api/supplier/${id}`, { method: "DELETE" }); const j = await r.json(); if (j.success) fetchData(); else alert(j.message) }

  const showDetail = async (id: string) => { const r = await fetch(`/api/supplier/${id}`); const j = await r.json(); if (j.success) setDetail(j.data) }

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="page-header">
        <div><h1 className="page-title flex items-center gap-2"><Truck className="w-7 h-7 text-primary" /> Supplier</h1><p className="page-subtitle">{data.length} supplier</p></div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ nama: "", alamat: "", noTelp: "", email: "", catatan: "" }) }} className="btn-primary"><Plus className="w-4 h-4" /> Tambah</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card max-w-lg space-y-3">
          <h2 className="font-semibold">{editId ? "Edit" : "Tambah"} Supplier</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Nama *</label><input className="input-field" required value={form.nama} onChange={e => update("nama", e.target.value)} /></div>
            <div><label className="label">No. Telp</label><input className="input-field" value={form.noTelp} onChange={e => update("noTelp", e.target.value)} /></div>
            <div><label className="label">Email</label><input className="input-field" value={form.email} onChange={e => update("email", e.target.value)} /></div>
            <div><label className="label">Alamat</label><input className="input-field" value={form.alamat} onChange={e => update("alamat", e.target.value)} /></div>
          </div>
          <div><label className="label">Catatan</label><textarea className="input-field" rows={2} value={form.catatan} onChange={e => update("catatan", e.target.value)} /></div>
          <div className="flex gap-2"><button type="submit" disabled={saving} className="btn-primary">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}</button><button type="button" onClick={() => setShowForm(false)} className="btn-ghost"><X className="w-4 h-4" /> Batal</button></div>
        </form>
      )}

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{(detail as { nama: string }).nama}</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted">Alamat:</span> {(detail as { alamat: string }).alamat || "-"}</p>
              <p><span className="text-muted">Telp:</span> {(detail as { noTelp: string }).noTelp || "-"}</p>
              <p><span className="text-muted">Email:</span> {(detail as { email: string }).email || "-"}</p>
              <p><span className="text-muted">Catatan:</span> {(detail as { catatan: string }).catatan || "-"}</p>
            </div>
            {(detail as { barang: { id: string; nama: string; grade: string }[] }).barang?.length > 0 && (
              <div className="mt-4"><h3 className="font-semibold mb-2">Barang dari Supplier</h3>
                <div className="space-y-1">{(detail as { barang: { id: string; nama: string; grade: string }[] }).barang.map(b => <div key={b.id} className="text-sm p-2 rounded bg-input">{b.nama} (Grade {b.grade})</div>)}</div>
              </div>
            )}
            <button onClick={() => setDetail(null)} className="btn-secondary mt-4 w-full">Tutup</button>
          </div>
        </div>
      )}

      {loading ? <div className="card text-center py-12 text-muted">Memuat...</div> : (
        <div className="table-container">
          <table className="table-base">
            <thead><tr><th>Nama</th><th>Kontak</th><th>Barang</th><th>Aksi</th></tr></thead>
            <tbody>
              {data.map(s => (
                <tr key={s.id}>
                  <td className="font-medium">{s.nama}</td>
                  <td className="text-sm text-muted-foreground">{s.noTelp || s.email || "-"}</td>
                  <td><span className="badge-info">{s._count.barang}</span></td>
                  <td><div className="flex gap-1"><button onClick={() => showDetail(s.id)} className="btn-ghost p-2"><Eye className="w-4 h-4" /></button><button onClick={() => handleEdit(s)} className="btn-ghost p-2"><Pencil className="w-4 h-4" /></button><button onClick={() => handleDelete(s.id)} className="btn-ghost p-2 text-danger"><Trash2 className="w-4 h-4" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
