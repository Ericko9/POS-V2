"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Package, Plus, Search, Filter, AlertTriangle } from "lucide-react"
import { formatRupiah } from "@/lib/utils"

interface Barang {
  id: string; nama: string; grade: string; hargaJual: number; hargaModal: number;
  stokBagus: number; stokRusak: number; minStok: number; jumlahTerjual: number;
  kategori: { nama: string }; supplier: { nama: string } | null;
  promo: { id: string; diskon: number; tanggalMulai: string; tanggalAkhir: string }[];
}

export default function BarangPage() {
  const [barang, setBarang] = useState<Barang[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchBarang = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    const res = await fetch(`/api/barang?${params}`)
    const json = await res.json()
    if (json.success) setBarang(json.data)
    setLoading(false)
  }

  useEffect(() => { fetchBarang() }, [])

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Package className="w-7 h-7 text-primary" /> Manajemen Barang</h1>
          <p className="page-subtitle">{barang.length} produk terdaftar</p>
        </div>
        <Link href="/barang/baru" className="btn-primary"><Plus className="w-4 h-4" /> Tambah Barang</Link>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input className="input-field pl-10" placeholder="Cari barang..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchBarang()} />
        </div>
        <button onClick={fetchBarang} className="btn-secondary"><Filter className="w-4 h-4" /> Filter</button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card text-center py-12 text-muted">Memuat data...</div>
      ) : barang.length === 0 ? (
        <div className="card text-center py-12 text-muted">Belum ada barang</div>
      ) : (
        <div className="table-container">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nama</th><th>Grade</th><th>Kategori</th><th>Harga Jual</th>
                <th>Stok</th><th>Terjual</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {barang.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/barang/${b.id}`} className="text-primary hover:underline font-medium">{b.nama}</Link>
                    {b.promo.length > 0 && <span className="badge-success ml-2">Promo</span>}
                  </td>
                  <td><span className="badge-info">{b.grade}</span></td>
                  <td className="text-muted-foreground">{b.kategori.nama}</td>
                  <td className="font-medium">
                    {b.promo.length > 0 ? (
                      <div>
                        <span className="line-through text-muted text-xs">{formatRupiah(b.hargaJual)}</span>
                        <br /><span className="text-success">{formatRupiah(b.hargaJual - b.promo[0].diskon)}</span>
                      </div>
                    ) : formatRupiah(b.hargaJual)}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="text-success">{b.stokBagus}</span>
                      {b.stokRusak > 0 && <span className="text-danger text-xs">({b.stokRusak} rusak)</span>}
                      {b.stokBagus <= b.minStok && <AlertTriangle className="w-4 h-4 text-warning" />}
                    </div>
                  </td>
                  <td>{b.jumlahTerjual}</td>
                  <td>{b.stokBagus <= b.minStok ? <span className="badge-warning">Stok Menipis</span> : <span className="badge-success">Tersedia</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
