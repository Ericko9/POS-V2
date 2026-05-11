"use client"
import { useState, useEffect } from "react"
import { Tags, Plus, Pencil, Trash2, X, Loader2 } from "lucide-react"

interface Kategori { id: string; nama: string; _count: { barang: number } }

export default function KategoriPage() {
  const [data, setData] = useState<Kategori[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [nama, setNama] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch("/api/kategori")
    const json = await res.json()
    if (json.success) setData(json.data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const url = editId ? `/api/kategori/${editId}` : "/api/kategori"
    const method = editId ? "PUT" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nama }) })
    const json = await res.json()
    if (json.success) { setShowForm(false); setEditId(null); setNama(""); fetchData() }
    else alert(json.message)
    setSaving(false)
  }

  const handleEdit = (k: Kategori) => { setEditId(k.id); setNama(k.nama); setShowForm(true) }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus kategori ini?")) return
    const res = await fetch(`/api/kategori/${id}`, { method: "DELETE" })
    const json = await res.json()
    if (json.success) fetchData()
    else alert(json.message)
  }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="page-header">
        <div><h1 className="page-title flex items-center gap-2"><Tags className="w-7 h-7 text-primary" /> Kategori</h1><p className="page-subtitle">{data.length} kategori</p></div>
        <button onClick={() => { setShowForm(true); setEditId(null); setNama("") }} className="btn-primary"><Plus className="w-4 h-4" /> Tambah</button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="card max-w-md flex gap-3 items-end">
          <div className="flex-1"><label className="label">{editId ? "Edit" : "Nama"} Kategori</label><input className="input-field" required value={nama} onChange={e => setNama(e.target.value)} /></div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}</button>
          <button type="button" onClick={() => setShowForm(false)} className="btn-ghost"><X className="w-4 h-4" /></button>
        </form>
      )}
      {loading ? <div className="card text-center py-12 text-muted">Memuat...</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(k => (
            <div key={k.id} className="card-hover flex items-center justify-between">
              <div><p className="font-medium text-foreground">{k.nama}</p><p className="text-xs text-muted">{k._count.barang} barang</p></div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(k)} className="btn-ghost p-2"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(k.id)} className="btn-ghost p-2 text-danger"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
