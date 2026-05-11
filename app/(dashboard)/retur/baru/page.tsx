"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search, Loader2 } from "lucide-react"
import Link from "next/link"
import { formatRupiah } from "@/lib/utils"

interface NotaItem { barangId: string; jumlah: number; hargaSatuan: number; diskon: number; barang: { nama: string; grade: string } }
interface NotaResult { id: string; nomorNota: string; namaPelanggan: string; items: NotaItem[] }
interface ReturItem { barangId: string; nama: string; jumlahMax: number; jumlah: number; kondisi: "BAGUS" | "RUSAK" }

export default function BuatReturPage() {
  const router = useRouter()
  const [searchNota, setSearchNota] = useState("")
  const [nota, setNota] = useState<NotaResult | null>(null)
  const [returItems, setReturItems] = useState<ReturItem[]>([])
  const [alasan, setAlasan] = useState("")
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  const cariNota = async () => {
    if (!searchNota) return
    setSearching(true)
    const res = await fetch(`/api/nota?search=${encodeURIComponent(searchNota)}`)
    const json = await res.json()
    if (json.success && json.data.length > 0) {
      const notaId = json.data[0].id
      const detailRes = await fetch(`/api/nota/${notaId}`)
      const detailJson = await detailRes.json()
      if (detailJson.success) {
        setNota(detailJson.data)
        setReturItems(detailJson.data.items.map((item: NotaItem) => ({
          barangId: item.barangId, nama: item.barang.nama,
          jumlahMax: item.jumlah, jumlah: 0, kondisi: "BAGUS" as const,
        })))
      }
    } else { alert("Nota tidak ditemukan"); setNota(null) }
    setSearching(false)
  }

  const updateItem = (idx: number, field: string, value: string | number) => {
    const items = [...returItems]
    if (field === "jumlah") items[idx].jumlah = Math.min(Number(value), items[idx].jumlahMax)
    else if (field === "kondisi") items[idx].kondisi = value as "BAGUS" | "RUSAK"
    setReturItems(items)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const items = returItems.filter(i => i.jumlah > 0)
    if (items.length === 0) return alert("Pilih minimal 1 barang untuk diretur")
    if (!alasan) return alert("Isi alasan retur")
    setLoading(true)
    const res = await fetch("/api/retur", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notaId: nota!.id, alasan, items: items.map(i => ({ barangId: i.barangId, jumlah: i.jumlah, kondisi: i.kondisi })) }),
    })
    const json = await res.json()
    if (json.success) router.push("/retur")
    else alert(json.message)
    setLoading(false)
  }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="page-header">
        <div className="flex items-center gap-3"><Link href="/retur" className="btn-ghost p-2"><ArrowLeft className="w-5 h-5" /></Link><h1 className="page-title">Buat Retur Baru</h1></div>
      </div>

      <div className="card max-w-2xl">
        <h2 className="font-semibold mb-3">Cari Nota</h2>
        <div className="flex gap-3">
          <input className="input-field flex-1" placeholder="Nomor nota atau nama pelanggan..." value={searchNota} onChange={e => setSearchNota(e.target.value)} onKeyDown={e => e.key === "Enter" && cariNota()} />
          <button onClick={cariNota} disabled={searching} className="btn-primary">{searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Cari</button>
        </div>
      </div>

      {nota && (
        <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
          <div><p className="font-semibold">Nota: {nota.nomorNota}</p><p className="text-sm text-muted">Pelanggan: {nota.namaPelanggan}</p></div>

          <div className="space-y-3">
            {returItems.map((item, i) => (
              <div key={item.barangId} className="p-3 rounded-xl bg-input border border-border">
                <p className="font-medium text-sm mb-2">{item.nama} (maks: {item.jumlahMax})</p>
                <div className="flex gap-3 items-center">
                  <input type="number" min={0} max={item.jumlahMax} value={item.jumlah}
                    onChange={e => updateItem(i, "jumlah", e.target.value)} className="input-field w-20" />
                  <select value={item.kondisi} onChange={e => updateItem(i, "kondisi", e.target.value)} className="input-field w-32">
                    <option value="BAGUS">Bagus</option><option value="RUSAK">Rusak</option>
                  </select>
                  {item.jumlah > 0 && <span className="text-xs text-muted">{item.kondisi === "RUSAK" ? "Tidak ada pengembalian" : "Pengembalian penuh"}</span>}
                </div>
              </div>
            ))}
          </div>

          <div><label className="label">Alasan Retur *</label><textarea className="input-field" rows={2} required value={alasan} onChange={e => setAlasan(e.target.value)} placeholder="Alasan pengembalian barang..." /></div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Proses Retur"}
          </button>
        </form>
      )}
    </div>
  )
}
