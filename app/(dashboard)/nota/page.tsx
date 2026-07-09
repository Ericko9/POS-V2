"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { FileText, Plus, Search, Truck as TruckIcon } from "lucide-react"
import { formatRupiah, formatDateTime } from "@/lib/utils"

interface Nota {
  id: string; nomorNota: string; namaPelanggan: string; noHpPelanggan: string | null;
  totalHarga: number; statusPengiriman: string; createdAt: string;
  kasir: { nama: string }; _count: { items: number; retur: number };
}

export default function NotaPage() {
  const [data, setData] = useState<Nota[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [userRole, setUserRole] = useState<string>("")

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    const res = await fetch(`/api/nota?${params}`)
    const json = await res.json()
    if (json.success) setData(json.data)
    setLoading(false)
  }

  const fetchUser = async () => {
    const res = await fetch("/api/profil")
    const json = await res.json()
    if (json.success) setUserRole(json.data.user.role)
  }

  useEffect(() => {
    fetchUser()
    fetchData()
  }, [])

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" /> 
            {userRole === "KURIR" ? "Daftar Pengiriman" : "Nota Penjualan"}
          </h1>
          <p className="page-subtitle">{data.length} data</p>
        </div>
        {userRole !== "KURIR" && (
          <Link href="/nota/baru" className="btn-primary">
            <Plus className="w-4 h-4" /> Buat Nota
          </Link>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input className="input-field pl-10" placeholder="Cari nomor nota atau pelanggan..." value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchData()} />
        </div>
        <button onClick={fetchData} className="btn-secondary">Cari</button>
      </div>

      {loading ? <div className="card text-center py-12 text-muted">Memuat...</div> : data.length === 0 ? <div className="card text-center py-12 text-muted">Belum ada nota</div> : (
        <div className="table-container">
          <table className="table-base">
            <thead><tr><th>No. Nota</th><th>Pelanggan</th><th>Items</th><th>Total</th><th>Pengiriman</th><th>Kasir</th><th>Tanggal</th></tr></thead>
            <tbody>
              {data.map(n => (
                <tr key={n.id}>
                  <td><Link href={`/nota/${n.id}`} className="text-primary hover:underline font-mono text-xs">{n.nomorNota}</Link></td>
                  <td><div><p className="font-medium">{n.namaPelanggan}</p>{n.noHpPelanggan && <p className="text-xs text-muted">{n.noHpPelanggan}</p>}</div></td>
                  <td><span className="badge-info">{n._count.items}</span>{n._count.retur > 0 && <span className="badge-warning ml-1">{n._count.retur} retur</span>}</td>
                  <td className="font-medium">{formatRupiah(n.totalHarga)}</td>
                  <td>
                    {n.statusPengiriman === "SUDAH_SAMPAI" ? (
                      <span className="badge-success flex items-center gap-1 w-fit"><TruckIcon className="w-3 h-3" /> Sudah Sampai</span>
                    ) : n.statusPengiriman === "AKAN_DIKIRIM" ? (
                      <span className="badge-info flex items-center gap-1 w-fit"><TruckIcon className="w-3 h-3" /> Akan Dikirim</span>
                    ) : (
                      <span className="badge-warning">Belum Dikirim</span>
                    )}
                  </td>
                  <td className="text-muted-foreground text-sm">{n.kasir.nama}</td>
                  <td className="text-sm text-muted-foreground">{formatDateTime(n.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
