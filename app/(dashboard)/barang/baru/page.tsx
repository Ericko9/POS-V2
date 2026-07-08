"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Loader2, Upload, Trash2 } from "lucide-react"
import Link from "next/link"

export default function TambahBarangPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [kategori, setKategori] = useState<{ id: string; nama: string }[]>([])
  const [supplier, setSupplier] = useState<{ id: string; nama: string }[]>([])
  const [form, setForm] = useState({
    nama: "", grade: "A", hargaJual: "", hargaModal: "",
    stokBagus: "0", stokRusak: "0", minStok: "5", fotoUrl: "", kategoriId: "", supplierId: "",
  })

  useEffect(() => {
    fetch("/api/kategori").then(r => r.json()).then(d => d.success && setKategori(d.data))
    fetch("/api/supplier").then(r => r.json()).then(d => d.success && setSupplier(d.data))
  }, [])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const json = await res.json()
      if (json.success) {
        update("fotoUrl", json.url)
      } else {
        alert(json.message)
      }
    } catch {
      alert("Gagal mengunggah foto")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      nama: (formData.get("nama") as string) || form.nama,
      grade: (formData.get("grade") as string) || form.grade,
      hargaJual: (formData.get("hargaJual") as string) || form.hargaJual,
      hargaModal: (formData.get("hargaModal") as string) || form.hargaModal,
      stokBagus: (formData.get("stokBagus") as string) || form.stokBagus,
      stokRusak: form.stokRusak,
      minStok: (formData.get("minStok") as string) || form.minStok,
      fotoUrl: form.fotoUrl,
      kategoriId: (formData.get("kategoriId") as string) || form.kategoriId,
      supplierId: (formData.get("supplierId") as string) || form.supplierId || null,
    }

    const res = await fetch("/api/barang", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
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
          <div><label className="label">Nama Barang *</label><input name="nama" className="input-field" required value={form.nama} onChange={e => update("nama", e.target.value)} /></div>
          <div><label className="label">Grade *</label>
            <select name="grade" className="input-field" value={form.grade} onChange={e => update("grade", e.target.value)}>
              {["A","B","C","D"].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div><label className="label">Harga Jual *</label><input name="hargaJual" type="number" min="0" className="input-field" required value={form.hargaJual} onChange={e => update("hargaJual", e.target.value)} /></div>
          <div><label className="label">Harga Modal</label><input name="hargaModal" type="number" min="0" className="input-field" value={form.hargaModal} onChange={e => update("hargaModal", e.target.value)} /></div>
          <div><label className="label">Stok Bagus</label><input name="stokBagus" type="number" min="0" className="input-field" value={form.stokBagus} onChange={e => update("stokBagus", e.target.value)} /></div>
          <div><label className="label">Min. Stok</label><input name="minStok" type="number" min="0" className="input-field" value={form.minStok} onChange={e => update("minStok", e.target.value)} /></div>
          <div><label className="label">Kategori *</label>
            <select name="kategoriId" className="input-field" required value={form.kategoriId} onChange={e => update("kategoriId", e.target.value)}>
              <option value="">Pilih Kategori</option>
              {kategori.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
          <div><label className="label">Supplier</label>
            <select name="supplierId" className="input-field" value={form.supplierId} onChange={e => update("supplierId", e.target.value)}>
              <option value="">Tanpa Supplier</option>
              {supplier.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Foto Barang (Maks. 5MB, Auto-Compress)</label>
            <div className="mt-1 flex items-center gap-4">
              {form.fotoUrl ? (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border group">
                  <img src={form.fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => update("fotoUrl", "")}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-border hover:border-primary rounded-xl cursor-pointer transition-colors duration-200 bg-input">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted" />
                      <span className="text-xs text-muted mt-2">Pilih Foto</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
              )}
            </div>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
        </button>
      </form>
    </div>
  )
}
