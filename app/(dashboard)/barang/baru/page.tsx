"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"

export default function TambahBarangPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [kategori, setKategori] = useState<{ id: string; nama: string }[]>([])
  const [supplier, setSupplier] = useState<{ id: string; nama: string }[]>([])
  const [form, setForm] = useState({
    nama: "", grade: "A", hargaJual: "", hargaModal: "",
    stokBagus: "0", stokRusak: "0", minStok: "5", kategoriId: "", supplierId: "",
  })

  useEffect(() => {
    fetch("/api/kategori").then(r => r.json()).then(d => d.success && setKategori(d.data))
    fetch("/api/supplier").then(r => r.json()).then(d => d.success && setSupplier(d.data))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/barang", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (json.success) router.push("/barang")
    else alert(json.message)
    setLoading(false)
  }

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/barang" className="btn-ghost p-2"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="page-title">Tambah Barang Baru</h1></div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Nama Barang *</label><input className="input-field" required value={form.nama} onChange={e => update("nama", e.target.value)} /></div>
          <div><label className="label">Grade *</label>
            <select className="input-field" value={form.grade} onChange={e => update("grade", e.target.value)}>
              {["A","B","C","D"].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div><label className="label">Harga Jual *</label><input type="number" className="input-field" required value={form.hargaJual} onChange={e => update("hargaJual", e.target.value)} /></div>
          <div><label className="label">Harga Modal</label><input type="number" className="input-field" value={form.hargaModal} onChange={e => update("hargaModal", e.target.value)} /></div>
          <div><label className="label">Stok Bagus</label><input type="number" className="input-field" value={form.stokBagus} onChange={e => update("stokBagus", e.target.value)} /></div>
          <div><label className="label">Min. Stok</label><input type="number" className="input-field" value={form.minStok} onChange={e => update("minStok", e.target.value)} /></div>
          <div><label className="label">Kategori *</label>
            <select className="input-field" required value={form.kategoriId} onChange={e => update("kategoriId", e.target.value)}>
              <option value="">Pilih Kategori</option>
              {kategori.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
          <div><label className="label">Supplier</label>
            <select className="input-field" value={form.supplierId} onChange={e => update("supplierId", e.target.value)}>
              <option value="">Tanpa Supplier</option>
              {supplier.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
        </button>
      </form>
    </div>
  )
}
