"use client"
import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Loader2, Trash2, Plus, Tag } from "lucide-react"
import Link from "next/link"
import { formatRupiah, formatDate } from "@/lib/utils"

export default function DetailBarangPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [barang, setBarang] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPromo, setShowPromo] = useState(false)
  const [promo, setPromo] = useState({ diskon: "", tanggalMulai: "", tanggalAkhir: "" })
  const [kategori, setKategori] = useState<{ id: string; nama: string }[]>([])
  const [supplier, setSupplier] = useState<{ id: string; nama: string }[]>([])
  const [form, setForm] = useState({ nama: "", grade: "", hargaJual: "", hargaModal: "", stokBagus: "", stokRusak: "", minStok: "", kategoriId: "", supplierId: "" })

  const fetchData = async () => {
    setLoading(true)
    const [bRes, kRes, sRes] = await Promise.all([
      fetch(`/api/barang/${id}`), fetch("/api/kategori"), fetch("/api/supplier"),
    ])
    const [bData, kData, sData] = await Promise.all([bRes.json(), kRes.json(), sRes.json()])
    if (bData.success) {
      setBarang(bData.data)
      const b = bData.data
      setForm({ nama: b.nama, grade: b.grade, hargaJual: String(b.hargaJual), hargaModal: String(b.hargaModal), stokBagus: String(b.stokBagus), stokRusak: String(b.stokRusak), minStok: String(b.minStok), kategoriId: b.kategoriId, supplierId: b.supplierId || "" })
    }
    if (kData.success) setKategori(kData.data)
    if (sData.success) setSupplier(sData.data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const res = await fetch(`/api/barang/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const json = await res.json()
    if (json.success) { alert("Berhasil disimpan"); fetchData() }
    else alert(json.message)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm("Hapus barang ini?")) return
    const res = await fetch(`/api/barang/${id}`, { method: "DELETE" })
    const json = await res.json()
    if (json.success) router.push("/barang")
    else alert(json.message)
  }

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch(`/api/barang/${id}/promo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(promo) })
    const json = await res.json()
    if (json.success) { setShowPromo(false); setPromo({ diskon: "", tanggalMulai: "", tanggalAkhir: "" }); fetchData() }
    else alert(json.message)
  }

  const handleDeletePromo = async (promoId: string) => {
    if (!confirm("Hapus promo ini?")) return
    const res = await fetch(`/api/barang/${id}/promo/${promoId}`, { method: "DELETE" })
    const json = await res.json()
    if (json.success) fetchData()
    else alert(json.message)
  }

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  if (loading) return <div className="card text-center py-12 text-muted pt-12 lg:pt-0">Memuat...</div>
  if (!barang) return <div className="card text-center py-12 text-muted pt-12 lg:pt-0">Barang tidak ditemukan</div>

  const promoList = (barang as { promo: { id: string; diskon: number; tanggalMulai: string; tanggalAkhir: string }[] }).promo || []

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/barang" className="btn-ghost p-2"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="page-title">Detail Barang</h1><p className="page-subtitle">{(barang as { nama: string }).nama}</p></div>
        </div>
        <button onClick={handleDelete} className="btn-danger"><Trash2 className="w-4 h-4" /> Hapus</button>
      </div>

      <form onSubmit={handleSave} className="card max-w-2xl space-y-4">
        <h2 className="text-lg font-semibold">Edit Informasi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Nama</label><input className="input-field" value={form.nama} onChange={e => update("nama", e.target.value)} /></div>
          <div><label className="label">Grade</label><select className="input-field" value={form.grade} onChange={e => update("grade", e.target.value)}>{["A","B","C","D"].map(g => <option key={g}>{g}</option>)}</select></div>
          <div><label className="label">Harga Jual</label><input type="number" className="input-field" value={form.hargaJual} onChange={e => update("hargaJual", e.target.value)} /></div>
          <div><label className="label">Harga Modal</label><input type="number" className="input-field" value={form.hargaModal} onChange={e => update("hargaModal", e.target.value)} /></div>
          <div><label className="label">Stok Bagus</label><input type="number" className="input-field" value={form.stokBagus} onChange={e => update("stokBagus", e.target.value)} /></div>
          <div><label className="label">Stok Rusak</label><input type="number" className="input-field" value={form.stokRusak} onChange={e => update("stokRusak", e.target.value)} /></div>
          <div><label className="label">Min. Stok</label><input type="number" className="input-field" value={form.minStok} onChange={e => update("minStok", e.target.value)} /></div>
          <div><label className="label">Kategori</label><select className="input-field" value={form.kategoriId} onChange={e => update("kategoriId", e.target.value)}>{kategori.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}</select></div>
          <div><label className="label">Supplier</label><select className="input-field" value={form.supplierId} onChange={e => update("supplierId", e.target.value)}><option value="">Tanpa Supplier</option>{supplier.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}</select></div>
        </div>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan</button>
      </form>

      {/* Promo section */}
      <div className="card max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Tag className="w-5 h-5 text-accent" /> Promo</h2>
          <button onClick={() => setShowPromo(!showPromo)} className="btn-secondary btn-sm"><Plus className="w-3 h-3" /> Tambah Promo</button>
        </div>
        {showPromo && (
          <form onSubmit={handleAddPromo} className="p-4 rounded-xl bg-input border border-border space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label">Diskon (Rp)</label><input type="number" className="input-field" required value={promo.diskon} onChange={e => setPromo(p => ({ ...p, diskon: e.target.value }))} /></div>
              <div><label className="label">Mulai</label><input type="date" className="input-field" required value={promo.tanggalMulai} onChange={e => setPromo(p => ({ ...p, tanggalMulai: e.target.value }))} /></div>
              <div><label className="label">Akhir</label><input type="date" className="input-field" required value={promo.tanggalAkhir} onChange={e => setPromo(p => ({ ...p, tanggalAkhir: e.target.value }))} /></div>
            </div>
            <button type="submit" className="btn-success btn-sm">Simpan Promo</button>
          </form>
        )}
        {promoList.length === 0 ? <p className="text-sm text-muted">Tidak ada promo</p> : (
          <div className="space-y-2">
            {promoList.map((p) => {
              const now = new Date()
              const isActive = new Date(p.tanggalMulai) <= now && new Date(p.tanggalAkhir) >= now
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-input border border-border">
                  <div>
                    <p className="font-medium">{formatRupiah(p.diskon)} potongan</p>
                    <p className="text-xs text-muted">{formatDate(p.tanggalMulai)} - {formatDate(p.tanggalAkhir)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive ? <span className="badge-success">Aktif</span> : <span className="badge-danger">Tidak Aktif</span>}
                    <button onClick={() => handleDeletePromo(p.id)} className="btn-ghost p-1.5 text-danger hover:bg-danger/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
