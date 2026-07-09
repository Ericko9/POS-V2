import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { formatRupiah, getStartOfDay, getEndOfDay, getStartOfWeek, getStartOfMonth } from "@/lib/utils"
import { redirect } from "next/navigation"
import {
  DollarSign, ShoppingCart, TrendingUp, AlertTriangle,
  Package, Truck
} from "lucide-react"
import Link from "next/link"
import DashboardCharts from "@/components/dashboard/DashboardCharts"

async function getDashboardData(userId: string, role: string) {
  const now = new Date()
  const startOfDay = getStartOfDay(now)
  const endOfDay = getEndOfDay(now)
  const startOfWeek = getStartOfWeek(now)
  const startOfMonth = getStartOfMonth(now)

  if (role === "KURIR") {
    // Courier specific queries
    const [totalTugas, pendingTugas, selesaiTugas, transaksiTerbaru] = await Promise.all([
      prisma.nota.count({ where: { kurirId: userId } }),
      prisma.nota.count({ where: { kurirId: userId, statusPengiriman: { in: ["BELUM_DIKIRIM", "AKAN_DIKIRIM"] } } }),
      prisma.nota.count({ where: { kurirId: userId, statusPengiriman: "SUDAH_SAMPAI" } }),
      prisma.nota.findMany({
        where: { kurirId: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { kasir: { select: { nama: true } } }
      })
    ])

    // Weekly deliveries count
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dayStart = getStartOfDay(d)
      const dayEnd = getEndOfDay(d)
      const count = await prisma.nota.count({
        where: { kurirId: userId, createdAt: { gte: dayStart, lte: dayEnd } }
      })
      days.push({
        tanggal: d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
        total: count
      })
    }

    return {
      totalTugas,
      pendingTugas,
      selesaiTugas,
      transaksiTerbaru: transaksiTerbaru.map(n => ({
        id: n.id, nomorNota: n.nomorNota, namaPelanggan: n.namaPelanggan,
        totalHarga: n.totalHarga, createdAt: n.createdAt.toISOString(), kasir: n.kasir.nama,
        statusPengiriman: n.statusPengiriman, alamatPelanggan: n.alamatPelanggan
      })),
      grafikMingguan: days,
      isKurir: true,
      stokMenipis: []
    }
  }

  // Admin / Kasir Query
  const where = role === "KASIR" ? { kasirId: userId } : {}

  const [hariIni, mingguIni, bulanIni, jumlahNota, stokMenipis, transaksiTerbaru] = await Promise.all([
    prisma.nota.aggregate({ _sum: { totalHarga: true }, where: { ...where, createdAt: { gte: startOfDay, lte: endOfDay } } }),
    prisma.nota.aggregate({ _sum: { totalHarga: true }, where: { ...where, createdAt: { gte: startOfWeek } } }),
    prisma.nota.aggregate({ _sum: { totalHarga: true }, where: { ...where, createdAt: { gte: startOfMonth } } }),
    prisma.nota.count({ where }),
    prisma.$queryRaw<Array<{ id: string; nama: string; grade: string; stokBagus: number; minStok: number }>>`
      SELECT id, nama, grade, "stokBagus", "minStok" FROM "Barang" WHERE "stokBagus" <= "minStok" ORDER BY "stokBagus" ASC LIMIT 10
    `,
    prisma.nota.findMany({
      where, orderBy: { createdAt: "desc" }, take: 5,
      include: { kasir: { select: { nama: true } } }
    }),
  ])

  // Weekly chart sales data
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dayStart = getStartOfDay(d)
    const dayEnd = getEndOfDay(d)
    const total = await prisma.nota.aggregate({
      _sum: { totalHarga: true },
      where: { ...where, createdAt: { gte: dayStart, lte: dayEnd } }
    })
    days.push({
      tanggal: d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
      total: total._sum.totalHarga || 0
    })
  }

  return {
    totalHariIni: hariIni._sum.totalHarga || 0,
    totalMingguIni: mingguIni._sum.totalHarga || 0,
    totalBulanIni: bulanIni._sum.totalHarga || 0,
    jumlahNota,
    stokMenipis: Array.isArray(stokMenipis) ? stokMenipis : [],
    transaksiTerbaru: transaksiTerbaru.map(n => ({
      id: n.id, nomorNota: n.nomorNota, namaPelanggan: n.namaPelanggan,
      totalHarga: n.totalHarga, createdAt: n.createdAt.toISOString(), kasir: n.kasir.nama,
      statusPengiriman: n.statusPengiriman, alamatPelanggan: n.alamatPelanggan
    })),
    grafikMingguan: days,
    isKurir: false
  }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const data = (await getDashboardData(session.user.id, session.user.role)) as any

  const stats = data.isKurir ? [
    { label: "Total Pengiriman", value: data.totalTugas.toString(), icon: Package, color: "text-primary" },
    { label: "Pengiriman Aktif", value: data.pendingTugas.toString(), icon: AlertTriangle, color: "text-warning" },
    { label: "Pengiriman Selesai", value: data.selesaiTugas.toString(), icon: ShoppingCart, color: "text-success" },
  ] : [
    { label: "Penjualan Hari Ini", value: formatRupiah(data.totalHariIni), icon: DollarSign, color: "text-success" },
    { label: "Penjualan Minggu Ini", value: formatRupiah(data.totalMingguIni), icon: TrendingUp, color: "text-info" },
    { label: "Penjualan Bulan Ini", value: formatRupiah(data.totalBulanIni), icon: ShoppingCart, color: "text-primary" },
    { label: "Total Nota", value: data.jumlahNota.toString(), icon: Package, color: "text-accent" },
  ]

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Selamat datang, {session.user.name} ({session.user.role})!</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className="card-hover group">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center ${s.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="stat-value">{s.value}</p>
              <p className="stat-label">{s.label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {data.isKurir ? "Grafik Pengantaran Barang 7 Hari Terakhir" : "Grafik Penjualan 7 Hari Terakhir"}
          </h2>
          <DashboardCharts data={data.grafikMingguan} />
        </div>

        {/* Low stock alerts OR courier active deliveries */}
        {data.isKurir ? (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Alamat Pengiriman Aktif</h2>
            </div>
            {data.transaksiTerbaru.filter((t: any) => t.statusPengiriman !== "SUDAH_SAMPAI").length === 0 ? (
              <p className="text-sm text-muted">Tidak ada pengiriman aktif saat ini 👍</p>
            ) : (
              <div className="space-y-3">
                {data.transaksiTerbaru.filter((t: any) => t.statusPengiriman !== "SUDAH_SAMPAI").map((item: any) => (
                  <div key={item.id} className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-foreground">{item.namaPelanggan}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        item.statusPengiriman === "AKAN_DIKIRIM" ? "bg-info/10 text-info" : "bg-warning/10 text-warning"
                      }`}>
                        {item.statusPengiriman === "AKAN_DIKIRIM" ? "Perjalanan" : "Pending"}
                      </span>
                    </div>
                    <p className="text-xs text-muted font-mono mt-0.5">{item.nomorNota}</p>
                    {item.alamatPelanggan && <p className="text-xs text-muted-foreground mt-1 truncate">{item.alamatPelanggan}</p>}
                    <Link href={`/nota/${item.id}`} className="text-xs text-primary hover:underline block mt-2">Update Status &rarr;</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <h2 className="text-lg font-semibold text-foreground">Stok Menipis</h2>
            </div>
            {data.stokMenipis.length === 0 ? (
              <p className="text-sm text-muted">Semua stok aman 👍</p>
            ) : (
              <div className="space-y-3">
                {data.stokMenipis.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-warning/5 border border-warning/10">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.nama}</p>
                      <p className="text-xs text-muted">Grade {item.grade}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-warning">{item.stokBagus}</p>
                      <p className="text-xs text-muted">min: {item.minStok}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {data.isKurir ? "Daftar Pengiriman Terbaru" : "Transaksi Terbaru"}
          </h2>
          <Link href="/nota" className="btn-ghost btn-sm">Lihat Semua</Link>
        </div>
        {data.transaksiTerbaru.length === 0 ? (
          <p className="text-sm text-muted">Belum ada data</p>
        ) : (
          <div className="table-container">
            <table className="table-base">
              <thead>
                <tr>
                  <th>No. Nota</th>
                  <th>Pelanggan</th>
                  <th>Total</th>
                  <th>Status Kirim</th>
                  <th>Kasir</th>
                </tr>
              </thead>
              <tbody>
                {data.transaksiTerbaru.map((t: any) => (
                  <tr key={t.id}>
                    <td><Link href={`/nota/${t.id}`} className="text-primary hover:underline font-mono text-xs">{t.nomorNota}</Link></td>
                    <td>{t.namaPelanggan}</td>
                    <td className="font-medium">{formatRupiah(t.totalHarga)}</td>
                    <td>
                      {t.statusPengiriman === "SUDAH_SAMPAI" ? (
                        <span className="badge-success text-xs">Sudah Sampai</span>
                      ) : t.statusPengiriman === "AKAN_DIKIRIM" ? (
                        <span className="badge-info text-xs">Akan Dikirim</span>
                      ) : (
                        <span className="badge-warning text-xs">Belum Dikirim</span>
                      )}
                    </td>
                    <td className="text-muted-foreground">{t.kasir}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
