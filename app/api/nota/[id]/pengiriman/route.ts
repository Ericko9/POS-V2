import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendWhatsAppMessage } from "@/lib/whatsapp"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)

  const { id } = await params
  const { statusPengiriman, kurirId } = await req.json()

  // Prepare update data
  const updateData: Record<string, unknown> = {}
  if (statusPengiriman !== undefined) updateData.statusPengiriman = statusPengiriman
  if (kurirId !== undefined) updateData.kurirId = kurirId

  // Update in database
  const updatedNota = await prisma.nota.update({
    where: { id },
    data: updateData,
    include: {
      kurir: {
        select: { nama: true, noHp: true },
      },
    },
  })

  // Fetch shop details for notifications
  const toko = await prisma.profilToko.findFirst()
  const namaToko = toko?.namaToko || "Toko POS"

  // Send WhatsApp notifications on status changes
  if (updatedNota.noHpPelanggan) {
    if (statusPengiriman === "AKAN_DIKIRIM") {
      const namaKurir = updatedNota.kurir?.nama || "Kurir Toko"
      const noHpKurir = updatedNota.kurir?.noHp ? ` (${updatedNota.kurir.noHp})` : ""
      
      const pesan = `Halo Kak *${updatedNota.namaPelanggan}*,

Pesanan Anda dengan nomor nota *${updatedNota.nomorNota}* akan segera dikirim oleh Kurir kami: *${namaKurir}*${noHpKurir}.
Mohon bersiap untuk menerima paket Anda.

Terima kasih atas kepercayaan Anda belanja di *${namaToko}*! 🙏`
      
      await sendWhatsAppMessage(updatedNota.nomorNota, updatedNota.noHpPelanggan, pesan)
    } 
    else if (statusPengiriman === "SUDAH_SAMPAI") {
      const pesan = `Halo Kak *${updatedNota.namaPelanggan}*,

Kabar baik! Pesanan Anda dengan nomor nota *${updatedNota.nomorNota}* telah sampai ke tujuan dan diterima dengan baik oleh penerima.

Terima kasih banyak telah berbelanja di *${namaToko}*. Sehat selalu! 🙏`
      
      await sendWhatsAppMessage(updatedNota.nomorNota, updatedNota.noHpPelanggan, pesan)
    }
  }

  return json(updatedNota, true, "Status pengiriman diperbarui")
}
