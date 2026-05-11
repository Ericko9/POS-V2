import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

export async function GET() {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)

  const kasir = await prisma.user.findMany({
    where: { role: "KASIR" },
    select: { id: true, nama: true, username: true, email: true, noHp: true, aktif: true, catatan: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  return json(kasir)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)

  const body = await req.json()
  const { nama, username, password, email, noHp, catatan } = body

  if (!nama || !username || !password) return json(null, false, "Data kasir tidak lengkap", 400)

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) return json(null, false, "Username sudah digunakan", 400)

  const hashed = await bcrypt.hash(password, 12)
  const kasir = await prisma.user.create({
    data: { nama, username, password: hashed, email, noHp, catatan, role: "KASIR" },
    select: { id: true, nama: true, username: true, email: true, noHp: true, aktif: true, createdAt: true },
  })
  return json(kasir, true, "Kasir berhasil ditambahkan", 201)
}
