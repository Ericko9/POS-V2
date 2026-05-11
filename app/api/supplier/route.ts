import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

export async function GET() {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)

  const suppliers = await prisma.supplier.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { barang: true } } },
  })
  return json(suppliers)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)

  const body = await req.json()
  const supplier = await prisma.supplier.create({
    data: { nama: body.nama, alamat: body.alamat, noTelp: body.noTelp, email: body.email, catatan: body.catatan },
  })
  return json(supplier, true, "Supplier berhasil ditambahkan", 201)
}
