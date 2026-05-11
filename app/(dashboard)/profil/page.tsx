"use client"
import { useState, useEffect } from "react"
import { UserCircle, Store, Save, Loader2 } from "lucide-react"

export default function ProfilPage() {
  const [user, setUser] = useState({ nama: "", email: "", noHp: "", password: "", role: "" })
  const [toko, setToko] = useState({ namaToko: "", alamat: "", noTelp: "", emailToko: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/profil").then(r => r.json()).then(j => {
      if (j.success) {
        if (j.data.user) setUser({ nama: j.data.user.nama, email: j.data.user.email || "", noHp: j.data.user.noHp || "", password: "", role: j.data.user.role })
        if (j.data.toko) setToko({ namaToko: j.data.toko.namaToko, alamat: j.data.toko.alamat || "", noTelp: j.data.toko.noTelp || "", emailToko: j.data.toko.email || "" })
      }
    })
  }, [])

  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const body: Record<string, string> = { type: "user", nama: user.nama, email: user.email, noHp: user.noHp }
    if (user.password) body.password = user.password
    const r = await fetch("/api/profil", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const j = await r.json()
    if (j.success) { alert("Profil disimpan"); setUser(u => ({ ...u, password: "" })) }
    else alert(j.message)
    setSaving(false)
  }

  const saveToko = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const r = await fetch("/api/profil", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "toko", ...toko }) })
    const j = await r.json()
    if (j.success) alert("Profil toko disimpan")
    else alert(j.message)
    setSaving(false)
  }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="page-header"><h1 className="page-title flex items-center gap-2"><UserCircle className="w-7 h-7 text-primary" /> Profil</h1></div>

      <form onSubmit={saveUser} className="card max-w-lg space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><UserCircle className="w-5 h-5" /> Profil Pengguna</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Nama</label><input className="input-field" value={user.nama} onChange={e => setUser(u => ({ ...u, nama: e.target.value }))} /></div>
          <div><label className="label">Email</label><input className="input-field" value={user.email} onChange={e => setUser(u => ({ ...u, email: e.target.value }))} /></div>
          <div><label className="label">No. HP</label><input className="input-field" value={user.noHp} onChange={e => setUser(u => ({ ...u, noHp: e.target.value }))} /></div>
          <div><label className="label">Password Baru</label><input type="password" className="input-field" value={user.password} onChange={e => setUser(u => ({ ...u, password: e.target.value }))} placeholder="Kosongkan jika tidak diubah" /></div>
        </div>
        <button type="submit" disabled={saving} className="btn-primary"><Save className="w-4 h-4" /> Simpan</button>
      </form>

      {user.role === "ADMIN" && (
        <form onSubmit={saveToko} className="card max-w-lg space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Store className="w-5 h-5" /> Profil Toko</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Nama Toko</label><input className="input-field" value={toko.namaToko} onChange={e => setToko(t => ({ ...t, namaToko: e.target.value }))} /></div>
            <div><label className="label">No. Telp</label><input className="input-field" value={toko.noTelp} onChange={e => setToko(t => ({ ...t, noTelp: e.target.value }))} /></div>
            <div><label className="label">Email</label><input className="input-field" value={toko.emailToko} onChange={e => setToko(t => ({ ...t, emailToko: e.target.value }))} /></div>
            <div><label className="label">Alamat</label><input className="input-field" value={toko.alamat} onChange={e => setToko(t => ({ ...t, alamat: e.target.value }))} /></div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary"><Save className="w-4 h-4" /> Simpan Toko</button>
        </form>
      )}
    </div>
  )
}
