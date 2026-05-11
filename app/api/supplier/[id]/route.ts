import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  const { id } = await params
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { barang: { select: { id: true, nama: true, grade: true, hargaJual: true, stokBagus: true } } },
  })
  if (!supplier) return json(null, false, "Supplier tidak ditemukan", 404)
  return json(supplier)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)
  const { id } = await params
  const body = await req.json()
  const supplier = await prisma.supplier.update({
    where: { id },
    data: { nama: body.nama, alamat: body.alamat, noTelp: body.noTelp, email: body.email, catatan: body.catatan },
  })
  return json(supplier, true, "Supplier berhasil diperbarui")
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)
  const { id } = await params
  await prisma.supplier.delete({ where: { id } })
  return json(null, true, "Supplier berhasil dihapus")
}
