"use client"
import { useState, useEffect, use, useRef } from "react"
import { ArrowLeft, Printer, Truck, FileText, Trash2, Send } from "lucide-react"
import Link from "next/link"
import { formatRupiah, formatDateTime } from "@/lib/utils"
import CetakNota from "@/components/nota/CetakNota"
import CetakSuratJalan from "@/components/nota/CetakSuratJalan"

interface NotaDetail {
  id: string; nomorNota: string; namaPelanggan: string; noHpPelanggan: string | null;
  alamatPelanggan: string | null; catatan: string | null; totalHarga: number;
  statusPengiriman: string; createdAt: string;
  kasir: { nama: string };
  kurir?: { id: string; nama: string; noHp: string | null } | null;
  items: { id: string; jumlah: number; hargaSatuan: number; diskon: number; subtotal: number; barang: { nama: string; grade: string } }[];
  retur: { id: string; alasan: string; totalNilai: number; createdAt: string; items: { jumlah: number; kondisi: string; nilaiKembali: number; barang: { nama: string } }[] }[];
}

interface ProfilToko {
  namaToko: string; alamat: string | null; noTelp: string | null; email: string | null;
}

export default function DetailNotaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [nota, setNota] = useState<NotaDetail | null>(null)
  const [toko, setToko] = useState<ProfilToko | null>(null)
  const [loading, setLoading] = useState(true)
  const [printMode, setPrintMode] = useState<"nota" | "sj" | "gabungan" | null>(null)
  const [userRole, setUserRole] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [couriers, setCouriers] = useState<any[]>([])
  const [waLoading, setWaLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const fetchData = async () => {
    setLoading(true)
    const [notaRes, profilRes] = await Promise.all([
      fetch(`/api/nota/${id}`),
      fetch("/api/profil"),
    ])
    const notaJson = await notaRes.json()
    const profilJson = await profilRes.json()
    
    if (notaJson.success) setNota(notaJson.data)
    if (profilJson.success) {
      if (profilJson.data.toko) setToko(profilJson.data.toko)
      if (profilJson.data.user) {
        setUserRole(profilJson.data.user.role)
        setUserId(profilJson.data.user.id)
      }
    }

    // Fetch list of couriers if Admin/Kasir
    if (profilJson.success && (profilJson.data.user.role === "ADMIN" || profilJson.data.user.role === "KASIR")) {
      const staffRes = await fetch("/api/kasir")
      const staffJson = await staffRes.json()
      if (staffJson.success) {
        const listCouriers = staffJson.data.filter((u: any) => u.role === "KURIR" && u.aktif)
        setCouriers(listCouriers)
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const assignCourier = async (kurirId: string) => {
    const res = await fetch(`/api/nota/${id}/pengiriman`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kurirId: kurirId === "" ? null : kurirId })
    })
    const json = await res.json()
    if (json.success) {
      fetchData()
    } else {
      alert(json.message)
    }
  }

  const updatePengiriman = async (status: string) => {
    const res = await fetch(`/api/nota/${id}/pengiriman`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusPengiriman: status })
    })
    const json = await res.json()
    if (json.success) {
      fetchData()
    } else {
      alert(json.message)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Hapus nota ini? Stok akan dikembalikan.")) return
    const r = await fetch(`/api/nota/${id}`, { method: "DELETE" })
    const j = await r.json()
    if (j.success) window.location.href = "/nota"
    else alert(j.message)
  }

  const handlePrint = (mode: "nota" | "sj" | "gabungan") => {
    setPrintMode(mode)
    setTimeout(() => window.print(), 300)
  }

  const sendWhatsAppApi = async () => {
    setWaLoading(true)
    try {
      const res = await fetch(`/api/nota/${id}/whatsapp`, { method: "POST" })
      const json = await res.json()
      alert(json.message)
    } catch (e) {
      alert("Terjadi kesalahan jaringan")
    } finally {
      setWaLoading(false)
    }
  }

  const openWhatsAppManual = () => {
    if (!nota) return
    const namaToko = toko?.namaToko || "Toko POS"
    let statusText = "Belum Dikirim"
    if (nota.statusPengiriman === "AKAN_DIKIRIM") statusText = "Akan Dikirim / Di Perjalanan"
    if (nota.statusPengiriman === "SUDAH_SAMPAI") statusText = "Sudah Sampai / Diterima"

    let itemDetails = ""
    nota.items.forEach((item) => {
      const discInfo = item.diskon > 0 ? ` (disc: -${formatRupiah(item.diskon)})` : ""
      itemDetails += `- *${item.barang.nama}* (Grade ${item.barang.grade}) x ${item.jumlah} = *${formatRupiah(item.subtotal)}*${discInfo}\n`
    })

    const pesan = `Halo Kak *${nota.namaPelanggan}*,

Terima kasih telah berbelanja di *${namaToko}*.
Berikut rincian nota belanja Anda:

*No. Nota:* ${nota.nomorNota}
*Tanggal:* ${formatDateTime(nota.createdAt)}
*Total Belanja:* *${formatRupiah(nota.totalHarga)}*
*Status Pengiriman:* ${statusText}

*Rincian Item:*
${itemDetails}
${nota.catatan ? `*Catatan:* ${nota.catatan}\n` : ""}
Terima kasih dan sehat selalu! 🙏`

    // Format phone number
    let cleanedPhone = (nota.noHpPelanggan || "").replace(/\D/g, "")
    if (cleanedPhone.startsWith("0")) {
      cleanedPhone = "62" + cleanedPhone.slice(1)
    }
    window.open(`https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(pesan)}`, "_blank")
  }

  if (loading) return <div className="card text-center py-12 text-muted pt-12 lg:pt-0">Memuat...</div>
  if (!nota) return <div className="card text-center py-12 text-muted pt-12 lg:pt-0">Nota tidak ditemukan</div>

  const notaWithToko = { ...nota, toko }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="no-print page-header">
        <div className="flex items-center gap-3">
          <Link href="/nota" className="btn-ghost p-2"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="page-title">{nota.nomorNota}</h1>
            <p className="page-subtitle">{formatDateTime(nota.createdAt)}</p>
          </div>
        </div>
        {userRole !== "KURIR" && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => handlePrint("nota")} className="btn-secondary btn-sm"><Printer className="w-4 h-4" /> Cetak Nota</button>
            <button onClick={() => handlePrint("sj")} className="btn-secondary btn-sm"><FileText className="w-4 h-4" /> Surat Jalan</button>
            <button onClick={() => handlePrint("gabungan")} className="btn-secondary btn-sm"><Printer className="w-4 h-4" /> Gabungan</button>
            {userRole === "ADMIN" && (
              <button onClick={handleDelete} className="btn-danger btn-sm"><Trash2 className="w-4 h-4" /> Hapus</button>
            )}
          </div>
        )}
      </div>

      <div className="no-print grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold mb-4">Detail Item</h2>
          <div className="table-container">
            <table className="table-base">
              <thead><tr><th>Barang</th><th>Harga</th><th>Diskon</th><th>Qty</th><th>Subtotal</th></tr></thead>
              <tbody>
                {nota.items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-medium">{item.barang.nama}</p>
                      <p className="text-xs text-muted">Grade {item.barang.grade}</p>
                    </td>
                    <td>{formatRupiah(item.hargaSatuan)}</td>
                    <td>{item.diskon > 0 ? <span className="text-success">-{formatRupiah(item.diskon)}</span> : "-"}</td>
                    <td>{item.jumlah}</td>
                    <td className="font-medium">{formatRupiah(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-right font-semibold border-t border-border px-4 py-3">Total</td>
                  <td className="font-bold text-primary border-t border-border px-4 py-3">{formatRupiah(nota.totalHarga)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card space-y-3">
            <h2 className="font-semibold">Info Pelanggan</h2>
            <p className="text-sm"><span className="text-muted">Nama:</span> {nota.namaPelanggan}</p>
            {nota.noHpPelanggan && <p className="text-sm"><span className="text-muted">HP:</span> {nota.noHpPelanggan}</p>}
            {nota.alamatPelanggan && <p className="text-sm"><span className="text-muted">Alamat:</span> {nota.alamatPelanggan}</p>}
            {nota.catatan && <p className="text-sm"><span className="text-muted">Catatan:</span> {nota.catatan}</p>}
            <p className="text-sm"><span className="text-muted">Kasir:</span> {nota.kasir.nama}</p>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><Truck className="w-5 h-5 text-primary" /> Pengiriman</h2>
            <div>
              <p className="text-xs text-muted mb-1">Status Pengiriman:</p>
              {nota.statusPengiriman === "SUDAH_SAMPAI" ? (
                <span className="badge-success">Sudah Sampai / Diterima</span>
              ) : nota.statusPengiriman === "AKAN_DIKIRIM" ? (
                <span className="badge-info">Akan Dikirim / Di Perjalanan</span>
              ) : (
                <span className="badge-warning">Belum Dikirim</span>
              )}
            </div>

            {/* Courier selector for admin & kasir */}
            {userRole !== "KURIR" && (
              <div>
                <label className="label text-xs mb-1">Petugas Kurir:</label>
                <select
                  disabled={nota.statusPengiriman === "SUDAH_SAMPAI"}
                  className="input-field py-1 text-sm mt-1"
                  value={nota.kurir?.id || ""}
                  onChange={e => assignCourier(e.target.value)}
                >
                  <option value="">-- Belum Ditugaskan --</option>
                  {couriers.map(c => (
                    <option key={c.id} value={c.id}>{c.nama} ({c.noHp || "No HP -"})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Display Courier Name (if assigned) */}
            {nota.kurir && (
              <div className="p-2 rounded-xl bg-input border border-border text-xs">
                <p className="font-medium text-foreground">Kurir: {nota.kurir.nama}</p>
                {nota.kurir.noHp && <p className="text-muted mt-0.5">HP: {nota.kurir.noHp}</p>}
              </div>
            )}

            {/* Delivery status actions */}
            <div className="pt-2 space-y-2">
              {nota.statusPengiriman === "BELUM_DIKIRIM" && (
                <button
                  onClick={() => updatePengiriman("AKAN_DIKIRIM")}
                  className="btn-info btn-sm w-full flex items-center justify-center gap-1.5"
                >
                  <Truck className="w-4 h-4" /> Mulai Pengiriman (Akan Dikirim)
                </button>
              )}

              {nota.statusPengiriman === "AKAN_DIKIRIM" && (
                <button
                  onClick={() => updatePengiriman("SUDAH_SAMPAI")}
                  className="btn-success btn-sm w-full flex items-center justify-center gap-1.5"
                >
                  Tandai Sudah Sampai
                </button>
              )}

              {/* Admin reset controls */}
              {userRole === "ADMIN" && nota.statusPengiriman !== "BELUM_DIKIRIM" && (
                <button
                  onClick={() => updatePengiriman("BELUM_DIKIRIM")}
                  className="btn-ghost btn-sm w-full text-xs text-muted hover:text-foreground"
                >
                  Batalkan & Reset Status
                </button>
              )}
            </div>
          </div>

          {/* WhatsApp Action Card */}
          {nota.noHpPelanggan && (
            <div className="card space-y-3">
              <h2 className="font-semibold flex items-center gap-2">💬 Notifikasi WhatsApp</h2>
              <p className="text-xs text-muted">Kirim detail nota langsung ke nomor WhatsApp pelanggan *{nota.noHpPelanggan}*.</p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={sendWhatsAppApi}
                  disabled={waLoading}
                  className="btn-primary btn-sm w-full flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> {waLoading ? "Mengirim..." : "Kirim via API / Log"}
                </button>
                <button
                  onClick={openWhatsAppManual}
                  className="btn-secondary btn-sm w-full flex items-center justify-center gap-2"
                >
                  Kirim WA Manual (Web)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {nota.retur.length > 0 && (
        <div className="no-print card">
          <h2 className="font-semibold mb-3">Riwayat Retur</h2>
          {nota.retur.map(r => (
            <div key={r.id} className="p-3 rounded-xl bg-input border border-border mb-2">
              <p className="text-sm font-medium">Alasan: {r.alasan} · Nilai: {formatRupiah(r.totalNilai)}</p>
              <div className="mt-1 space-y-1">{r.items.map((ri, i) => <p key={i} className="text-xs text-muted">{ri.barang.nama} × {ri.jumlah} ({ri.kondisi})</p>)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Print area - using reusable components */}
      <div ref={printRef} className="hidden print:block print-area p-8">
        {(printMode === "nota" || printMode === "gabungan") && (
          <CetakNota nota={notaWithToko} />
        )}
        {printMode === "gabungan" && <div className="page-break" />}
        {(printMode === "sj" || printMode === "gabungan") && (
          <CetakSuratJalan nota={notaWithToko} />
        )}
      </div>
    </div>
  )
}
