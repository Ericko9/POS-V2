import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

// POST /api/barang/[id]/promo - Add promo to product
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)
  const { id } = await params

  const body = await req.json()
  const { diskon, tanggalMulai, tanggalAkhir } = body

  if (!diskon || !tanggalMulai || !tanggalAkhir) {
    return json(null, false, "Data promo tidak lengkap", 400)
  }

  const promo = await prisma.promo.create({
    data: {
      barangId: id,
      diskon: Number(diskon),
      tanggalMulai: new Date(tanggalMulai),
      tanggalAkhir: new Date(tanggalAkhir),
    },
  })

  return json(promo, true, "Promo berhasil ditambahkan", 201)
}
