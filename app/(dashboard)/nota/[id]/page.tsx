"use client"
import { useState, useEffect, use, useRef } from "react"
import { ArrowLeft, Printer, Truck, FileText, Trash2 } from "lucide-react"
import Link from "next/link"
import { formatRupiah, formatDateTime } from "@/lib/utils"
import CetakNota from "@/components/nota/CetakNota"
import CetakSuratJalan from "@/components/nota/CetakSuratJalan"

interface NotaDetail {
  id: string; nomorNota: string; namaPelanggan: string; noHpPelanggan: string | null;
  alamatPelanggan: string | null; catatan: string | null; totalHarga: number;
  statusPengiriman: string; createdAt: string;
  kasir: { nama: string };
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
    if (profilJson.success && profilJson.data.toko) setToko(profilJson.data.toko)
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [id])

  const updatePengiriman = async (status: string) => {
    await fetch(`/api/nota/${id}/pengiriman`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statusPengiriman: status }) })
    fetchData()
  }

  const handleDelete = async () => { if (!confirm("Hapus nota ini? Stok akan dikembalikan.")) return; const r = await fetch(`/api/nota/${id}`, { method: "DELETE" }); const j = await r.json(); if (j.success) window.location.href = "/nota"; else alert(j.message) }

  const handlePrint = (mode: "nota" | "sj" | "gabungan") => { setPrintMode(mode); setTimeout(() => window.print(), 300) }

  if (loading) return <div className="card text-center py-12 text-muted pt-12 lg:pt-0">Memuat...</div>
  if (!nota) return <div className="card text-center py-12 text-muted pt-12 lg:pt-0">Nota tidak ditemukan</div>

  const notaWithToko = { ...nota, toko }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="no-print page-header">
        <div className="flex items-center gap-3">
          <Link href="/nota" className="btn-ghost p-2"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="page-title">{nota.nomorNota}</h1><p className="page-subtitle">{formatDateTime(nota.createdAt)}</p></div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => handlePrint("nota")} className="btn-secondary btn-sm"><Printer className="w-4 h-4" /> Cetak Nota</button>
          <button onClick={() => handlePrint("sj")} className="btn-secondary btn-sm"><FileText className="w-4 h-4" /> Surat Jalan</button>
          <button onClick={() => handlePrint("gabungan")} className="btn-secondary btn-sm"><Printer className="w-4 h-4" /> Gabungan</button>
          <button onClick={handleDelete} className="btn-danger btn-sm"><Trash2 className="w-4 h-4" /> Hapus</button>
        </div>
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
                    <td><p className="font-medium">{item.barang.nama}</p><p className="text-xs text-muted">Grade {item.barang.grade}</p></td>
                    <td>{formatRupiah(item.hargaSatuan)}</td>
                    <td>{item.diskon > 0 ? <span className="text-success">-{formatRupiah(item.diskon)}</span> : "-"}</td>
                    <td>{item.jumlah}</td>
                    <td className="font-medium">{formatRupiah(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={4} className="text-right font-semibold border-t border-border px-4 py-3">Total</td><td className="font-bold text-primary border-t border-border px-4 py-3">{formatRupiah(nota.totalHarga)}</td></tr></tfoot>
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
            <h2 className="font-semibold flex items-center gap-2"><Truck className="w-5 h-5" /> Pengiriman</h2>
            <p>{nota.statusPengiriman === "SUDAH_DIKIRIM" ? <span className="badge-success">Sudah Dikirim</span> : <span className="badge-warning">Belum Dikirim</span>}</p>
            {nota.statusPengiriman === "BELUM_DIKIRIM" ? (
              <button onClick={() => updatePengiriman("SUDAH_DIKIRIM")} className="btn-success btn-sm w-full">Tandai Sudah Dikirim</button>
            ) : (
              <button onClick={() => updatePengiriman("BELUM_DIKIRIM")} className="btn-secondary btn-sm w-full">Batalkan Pengiriman</button>
            )}
          </div>
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
