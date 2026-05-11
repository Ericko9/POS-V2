import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)
  const { id } = await params
  const { nama } = await req.json()
  const kategori = await prisma.kategori.update({ where: { id }, data: { nama } })
  return json(kategori, true, "Kategori berhasil diperbarui")
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)
  const { id } = await params
  const count = await prisma.barang.count({ where: { kategoriId: id } })
  if (count > 0) return json(null, false, "Kategori masih digunakan oleh barang", 400)
  await prisma.kategori.delete({ where: { id } })
  return json(null, true, "Kategori berhasil dihapus")
}
