import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {
    nama: body.nama, email: body.email, noHp: body.noHp, catatan: body.catatan,
    role: body.role,
  }
  if (body.password) data.password = await bcrypt.hash(body.password, 12)

  const kasir = await prisma.user.update({
    where: { id }, data,
    select: { id: true, nama: true, username: true, email: true, noHp: true, role: true, aktif: true },
  })
  return json(kasir, true, "Data staf diperbarui")
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)
  const { id } = await params

  await prisma.user.update({ where: { id }, data: { aktif: false } })
  return json(null, true, "Kasir berhasil dinonaktifkan")
}
