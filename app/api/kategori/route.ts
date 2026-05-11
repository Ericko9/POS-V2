import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

export async function GET() {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)

  const kategori = await prisma.kategori.findMany({
    orderBy: { nama: "asc" },
    include: { _count: { select: { barang: true } } },
  })
  return json(kategori)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)

  const { nama } = await req.json()
  if (!nama) return json(null, false, "Nama kategori wajib diisi", 400)

  const existing = await prisma.kategori.findUnique({ where: { nama } })
  if (existing) return json(null, false, "Kategori sudah ada", 400)

  const kategori = await prisma.kategori.create({ data: { nama } })
  return json(kategori, true, "Kategori berhasil ditambahkan", 201)
}
