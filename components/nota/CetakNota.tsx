"use client"
import { formatRupiah, formatDateTime } from "@/lib/utils"

interface NotaItem {
  id: string
  jumlah: number
  hargaSatuan: number
  diskon: number
  subtotal: number
  barang: { nama: string; grade: string }
}

interface NotaData {
  nomorNota: string
  namaPelanggan: string
  noHpPelanggan: string | null
  alamatPelanggan: string | null
  catatan: string | null
  totalHarga: number
  createdAt: string
  kasir: { nama: string }
  items: NotaItem[]
  toko?: { namaToko: string; alamat: string | null; noTelp: string | null; email: string | null } | null
}

interface CetakNotaProps {
  nota: NotaData
}

export default function CetakNota({ nota }: CetakNotaProps) {
  return (
    <div>
      {/* Header - Profil Toko */}
      <div className="text-center mb-6">
        {nota.toko && (
          <>
            <h1 className="text-xl font-bold uppercase">{nota.toko.namaToko}</h1>
            {nota.toko.alamat && <p className="text-xs">{nota.toko.alamat}</p>}
            {(nota.toko.noTelp || nota.toko.email) && (
              <p className="text-xs">
                {nota.toko.noTelp}{nota.toko.noTelp && nota.toko.email && " | "}{nota.toko.email}
              </p>
            )}
            <hr className="my-3 border-black" />
          </>
        )}
        <h2 className="text-lg font-bold">FAKTUR / NOTA</h2>
        <p className="text-sm">{nota.nomorNota} · {formatDateTime(nota.createdAt)}</p>
      </div>

      {/* Customer Info */}
      <div className="mb-4 text-sm">
        <p>Pelanggan: {nota.namaPelanggan}</p>
        {nota.noHpPelanggan && <p>No. HP: {nota.noHpPelanggan}</p>}
        {nota.alamatPelanggan && <p>Alamat: {nota.alamatPelanggan}</p>}
        <p>Kasir: {nota.kasir.nama}</p>
      </div>

      {/* Items Table */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-1">Barang</th>
            <th className="text-center">Grade</th>
            <th className="text-right">Harga</th>
            <th className="text-right">Diskon</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {nota.items.map((item) => (
            <tr key={item.id} className="border-b border-gray-300">
              <td className="py-1">{item.barang.nama}</td>
              <td className="text-center">{item.barang.grade}</td>
              <td className="text-right">{formatRupiah(item.hargaSatuan)}</td>
              <td className="text-right">{item.diskon > 0 ? `-${formatRupiah(item.diskon)}` : "-"}</td>
              <td className="text-right">{item.jumlah}</td>
              <td className="text-right">{formatRupiah(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black">
            <td colSpan={5} className="text-right font-bold py-2">TOTAL</td>
            <td className="text-right font-bold">{formatRupiah(nota.totalHarga)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Notes */}
      {nota.catatan && (
        <p className="mt-4 text-sm">Catatan: {nota.catatan}</p>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-500">
        <p>Terima kasih atas kunjungan Anda</p>
      </div>
    </div>
  )
}
