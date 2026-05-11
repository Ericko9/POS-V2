"use client"
import { useState, useEffect } from "react"
import { Users, Plus, Pencil, Trash2, X, Loader2 } from "lucide-react"

interface Kasir { id: string; nama: string; username: string; email: string | null; noHp: string | null; aktif: boolean; catatan: string | null; createdAt: string }

export default function KasirPage() {
  const [data, setData] = useState<Kasir[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ nama: "", username: "", password: "", email: "", noHp: "", catatan: "" })
  const [saving, setSaving] = useState(false)

  const fetchData = async () => { setLoading(true); const r = await fetch("/api/kasir"); const j = await r.json(); if (j.success) setData(j.data); setLoading(false) }
  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const url = editId ? `/api/kasir/${editId}` : "/api/kasir"
    const method = editId ? "PUT" : "POST"
    const body = editId && !form.password ? { ...form, password: undefined } : form
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const json = await res.json()
    if (json.success) { setShowForm(false); setEditId(null); setForm({ nama: "", username: "", password: "", email: "", noHp: "", catatan: "" }); fetchData() }
    else alert(json.message)
    setSaving(false)
  }

  const handleEdit = (k: Kasir) => { setEditId(k.id); setForm({ nama: k.nama, username: k.username, password: "", email: k.email || "", noHp: k.noHp || "", catatan: k.catatan || "" }); setShowForm(true) }

  const handleDelete = async (id: string) => { if (!confirm("Nonaktifkan kasir ini?")) return; const r = await fetch(`/api/kasir/${id}`, { method: "DELETE" }); const j = await r.json(); if (j.success) fetchData(); else alert(j.message) }

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="page-header">
        <div><h1 className="page-title flex items-center gap-2"><Users className="w-7 h-7 text-primary" /> Manajemen Kasir</h1><p className="page-subtitle">{data.length} kasir</p></div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ nama: "", username: "", password: "", email: "", noHp: "", catatan: "" }) }} className="btn-primary"><Plus className="w-4 h-4" /> Tambah Kasir</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card max-w-lg space-y-3">
          <h2 className="font-semibold">{editId ? "Edit" : "Tambah"} Kasir</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Nama *</label><input className="input-field" required value={form.nama} onChange={e => update("nama", e.target.value)} /></div>
            <div><label className="label">Username {!editId && "*"}</label><input className="input-field" required={!editId} disabled={!!editId} value={form.username} onChange={e => update("username", e.target.value)} /></div>
            <div><label className="label">Password {!editId && "*"}</label><input type="password" className="input-field" required={!editId} value={form.password} onChange={e => update("password", e.target.value)} placeholder={editId ? "Kosongkan jika tidak diubah" : ""} /></div>
            <div><label className="label">Email</label><input className="input-field" value={form.email} onChange={e => update("email", e.target.value)} /></div>
            <div><label className="label">No. HP</label><input className="input-field" value={form.noHp} onChange={e => update("noHp", e.target.value)} /></div>
          </div>
          <div><label className="label">Catatan</label><textarea className="input-field" rows={2} value={form.catatan} onChange={e => update("catatan", e.target.value)} /></div>
          <div className="flex gap-2"><button type="submit" disabled={saving} className="btn-primary">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}</button><button type="button" onClick={() => setShowForm(false)} className="btn-ghost"><X className="w-4 h-4" /> Batal</button></div>
        </form>
      )}

      {loading ? <div className="card text-center py-12 text-muted">Memuat...</div> : (
        <div className="table-container">
          <table className="table-base">
            <thead><tr><th>Nama</th><th>Username</th><th>Kontak</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {data.map(k => (
                <tr key={k.id}>
                  <td className="font-medium">{k.nama}</td>
                  <td className="font-mono text-sm">{k.username}</td>
                  <td className="text-sm text-muted-foreground">{k.email || k.noHp || "-"}</td>
                  <td>{k.aktif ? <span className="badge-success">Aktif</span> : <span className="badge-danger">Nonaktif</span>}</td>
                  <td><div className="flex gap-1"><button onClick={() => handleEdit(k)} className="btn-ghost p-2"><Pencil className="w-4 h-4" /></button><button onClick={() => handleDelete(k.id)} className="btn-ghost p-2 text-danger"><Trash2 className="w-4 h-4" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
