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
  const { statusPengiriman, kurirId, fotoBuktiUrl } = await req.json()

  // Prepare update data
  const updateData: Record<string, unknown> = {}
  if (statusPengiriman !== undefined) updateData.statusPengiriman = statusPengiriman
  if (kurirId !== undefined) updateData.kurirId = kurirId
  if (fotoBuktiUrl !== undefined) updateData.fotoBuktiUrl = fotoBuktiUrl

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

🚚 *PESANAN DALAM PERJALANAN*
Pesanan Anda dengan nomor nota *${updatedNota.nomorNota}* sedang dalam perjalanan dikirim oleh Kurir kami: *${namaKurir}*${noHpKurir}.

Mohon bersiap untuk menerima paket Anda. Terima kasih telah berbelanja di *${namaToko}*! 🙏`
      
      await sendWhatsAppMessage(updatedNota.nomorNota, updatedNota.noHpPelanggan, pesan)
    } 
    else if (statusPengiriman === "SUDAH_SAMPAI") {
      const buktiInfo = updatedNota.fotoBuktiUrl 
        ? `\n\n📌 Bukti foto penerimaan dapat dilihat di: ${updatedNota.fotoBuktiUrl}` 
        : ""
      
      const pesan = `Halo Kak *${updatedNota.namaPelanggan}*,

✅ *PESANAN TELAH DITERIMA*
Kabar baik! Pesanan Anda dengan nomor nota *${updatedNota.nomorNota}* telah sampai ke tujuan dan diterima dengan baik.${buktiInfo}

Terima kasih banyak telah berbelanja di *${namaToko}*. Sehat selalu! 🙏`
      
      await sendWhatsAppMessage(
        updatedNota.nomorNota, 
        updatedNota.noHpPelanggan, 
        pesan, 
        updatedNota.fotoBuktiUrl || undefined
      )
    }
  }

  return json(updatedNota, true, "Status pengiriman diperbarui")
}
