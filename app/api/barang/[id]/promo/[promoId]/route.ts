import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

// DELETE /api/barang/[id]/promo/[promoId] - Delete promo from product
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; promoId: string }> }
) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN")
    return json(null, false, "Forbidden", 403)

  const { id, promoId } = await params

  // Verify promo belongs to this product
  const promo = await prisma.promo.findUnique({
    where: { id: promoId },
  })

  if (!promo) return json(null, false, "Promo tidak ditemukan", 404)
  if (promo.barangId !== id)
    return json(null, false, "Promo tidak terkait dengan barang ini", 400)

  await prisma.promo.delete({ where: { id: promoId } })

  return json(null, true, "Promo berhasil dihapus")
}
