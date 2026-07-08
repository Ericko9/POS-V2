"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, Loader2, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { formatRupiah } from "@/lib/utils"

interface Barang {
  id: string; nama: string; grade: string; hargaJual: number; stokBagus: number;
  fotoUrl: string | null;
  promo: { diskon: number }[];
}
interface CartItem { barangId: string; nama: string; grade: string; hargaJual: number; diskon: number; jumlah: number }

export default function BuatNotaPage() {
  const router = useRouter()
  const [barangList, setBarangList] = useState<Barang[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [pelanggan, setPelanggan] = useState({ nama: "", noHp: "", alamat: "" })
  const [catatan, setCatatan] = useState("")
  const [loading, setLoading] = useState(false)
  const [searchBarang, setSearchBarang] = useState("")

  useEffect(() => { fetch("/api/barang").then(r => r.json()).then(d => d.success && setBarangList(d.data)) }, [])

  const addToCart = (b: Barang) => {
    if (cart.find(c => c.barangId === b.id)) return
    const diskon = b.promo.length > 0 ? b.promo[0].diskon : 0
    setCart([...cart, { barangId: b.id, nama: b.nama, grade: b.grade, hargaJual: b.hargaJual, diskon, jumlah: 1 }])
  }

  const updateQty = (idx: number, qty: number) => {
    const newCart = [...cart]; newCart[idx].jumlah = Math.max(1, qty); setCart(newCart)
  }

  const removeItem = (idx: number) => setCart(cart.filter((_, i) => i !== idx))

  const total = cart.reduce((sum, c) => sum + (c.hargaJual - c.diskon) * c.jumlah, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cart.length === 0) return alert("Tambahkan barang ke nota")
    setLoading(true)
    const res = await fetch("/api/nota", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        namaPelanggan: pelanggan.nama, noHpPelanggan: pelanggan.noHp, alamatPelanggan: pelanggan.alamat,
        catatan, items: cart.map(c => ({ barangId: c.barangId, jumlah: c.jumlah })),
      }),
    })
    const json = await res.json()
    if (json.success) router.push(`/nota/${json.data.id}`)
    else alert(json.message)
    setLoading(false)
  }

  const filteredBarang = barangList.filter(b => b.nama.toLowerCase().includes(searchBarang.toLowerCase()) && b.stokBagus > 0)

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/nota" className="btn-ghost p-2"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="page-title">Buat Nota Baru</h1></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product selection */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h2 className="font-semibold mb-3">Pilih Barang</h2>
            <input className="input-field mb-3" placeholder="Cari barang..." value={searchBarang} onChange={e => setSearchBarang(e.target.value)} />
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredBarang.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-input border border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    {b.fotoUrl ? (
                      <img src={b.fotoUrl} alt={b.nama} className="w-10 h-10 object-cover rounded-lg border border-border flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded-lg border border-border flex items-center justify-center text-muted text-[10px] flex-shrink-0">No Pic</div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{b.nama} <span className="badge-info ml-1">{b.grade}</span></p>
                      <p className="text-xs text-muted">Stok: {b.stokBagus} · {formatRupiah(b.hargaJual)}{b.promo.length > 0 && <span className="text-success"> (-{formatRupiah(b.promo[0].diskon)})</span>}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => addToCart(b)} className="btn-secondary btn-sm" disabled={!!cart.find(c => c.barangId === b.id)}><Plus className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="card">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Keranjang ({cart.length})</h2>
            {cart.length === 0 ? <p className="text-sm text-muted">Belum ada barang</p> : (
              <div className="space-y-2">
                {cart.map((c, i) => (
                  <div key={c.barangId} className="flex items-center justify-between p-3 rounded-xl bg-input border border-border">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{c.nama} ({c.grade})</p>
                      <p className="text-xs text-muted">{formatRupiah(c.hargaJual - c.diskon)} × {c.jumlah} = {formatRupiah((c.hargaJual - c.diskon) * c.jumlah)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" min={1} value={c.jumlah} onChange={e => updateQty(i, Number(e.target.value))} className="input-field w-16 text-center py-1" />
                      <button type="button" onClick={() => removeItem(i)} className="text-danger hover:bg-danger/10 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-3 border-t border-border">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg text-primary">{formatRupiah(total)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer info */}
        <div className="space-y-4">
          <div className="card space-y-3">
            <h2 className="font-semibold">Data Pelanggan</h2>
            <div><label className="label">Nama *</label><input className="input-field" required value={pelanggan.nama} onChange={e => setPelanggan(p => ({ ...p, nama: e.target.value }))} /></div>
            <div><label className="label">No. HP</label><input className="input-field" value={pelanggan.noHp} onChange={e => setPelanggan(p => ({ ...p, noHp: e.target.value }))} /></div>
            <div><label className="label">Alamat</label><textarea className="input-field" rows={2} value={pelanggan.alamat} onChange={e => setPelanggan(p => ({ ...p, alamat: e.target.value }))} /></div>
            <div><label className="label">Catatan</label><textarea className="input-field" rows={2} value={catatan} onChange={e => setCatatan(e.target.value)} /></div>
          </div>
          <button type="submit" disabled={loading || cart.length === 0} className="btn-primary w-full btn-lg">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Nota"}
          </button>
        </div>
      </form>
    </div>
  )
}
