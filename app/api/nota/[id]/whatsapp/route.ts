import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { formatRupiah, formatDateTime } from "@/lib/utils"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)

  const { id } = await params

  // Fetch the invoice details
  const nota = await prisma.nota.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          barang: true,
        },
      },
      kasir: {
        select: { nama: true },
      },
    },
  })

  if (!nota) return json(null, false, "Nota tidak ditemukan", 44)
  if (!nota.noHpPelanggan) return json(null, false, "Pelanggan tidak memiliki nomor HP", 400)

  // Fetch shop profile
  const toko = await prisma.profilToko.findFirst()
  const namaToko = toko?.namaToko || "Toko POS"

  // Construct message
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

  const result = await sendWhatsAppMessage(nota.nomorNota, nota.noHpPelanggan, pesan)

  if (result.success) {
    return json(result, true, "Nota berhasil dikirim ke WhatsApp")
  } else {
    return json(result, false, "Gagal mengirim nota ke WhatsApp: " + result.info, 500)
  }
}
