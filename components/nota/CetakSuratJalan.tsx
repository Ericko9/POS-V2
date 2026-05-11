"use client"
import { formatDateTime } from "@/lib/utils"

interface NotaItem {
  id: string
  jumlah: number
  barang: { nama: string; grade: string }
}

interface NotaData {
  nomorNota: string
  namaPelanggan: string
  alamatPelanggan: string | null
  createdAt: string
  items: NotaItem[]
  toko?: { namaToko: string; alamat: string | null; noTelp: string | null; email: string | null } | null
}

interface CetakSuratJalanProps {
  nota: NotaData
}

export default function CetakSuratJalan({ nota }: CetakSuratJalanProps) {
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
        <h2 className="text-lg font-bold">SURAT JALAN</h2>
        <p className="text-sm">{nota.nomorNota}</p>
      </div>

      {/* Delivery Info */}
      <div className="mb-4 text-sm">
        <p>Kepada: {nota.namaPelanggan}</p>
        {nota.alamatPelanggan && <p>Alamat: {nota.alamatPelanggan}</p>}
        <p>Tanggal: {formatDateTime(nota.createdAt)}</p>
      </div>

      {/* Items Table */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-1 w-12">No</th>
            <th className="text-left">Barang</th>
            <th className="text-center w-24">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {nota.items.map((item, i) => (
            <tr key={item.id} className="border-b border-gray-300">
              <td className="py-1">{i + 1}</td>
              <td>{item.barang.nama} (Grade {item.barang.grade})</td>
              <td className="text-center">{item.jumlah}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Signature Area */}
      <div className="mt-12 flex justify-between text-sm">
        <div className="text-center">
          <p>Pengirim</p>
          <div className="mt-16 border-t border-black w-32" />
          <p>(_________________)</p>
        </div>
        <div className="text-center">
          <p>Penerima</p>
          <div className="mt-16 border-t border-black w-32" />
          <p>(_________________)</p>
        </div>
      </div>
    </div>
  )
}
