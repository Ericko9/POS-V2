import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

// GET /api/barang/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  const { id } = await params

  const barang = await prisma.barang.findUnique({
    where: { id },
    include: {
      kategori: true, supplier: true,
      promo: { orderBy: { createdAt: "desc" } },
      itemNota: { take: 10, orderBy: { nota: { createdAt: "desc" } }, include: { nota: { select: { nomorNota: true, createdAt: true } } } },
    },
  })
  if (!barang) return json(null, false, "Barang tidak ditemukan", 404)
  return json(barang)
}

// PUT /api/barang/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)
  const { id } = await params

  const body = await req.json()
  const barang = await prisma.barang.update({
    where: { id },
    data: {
      nama: body.nama, grade: body.grade,
      hargaJual: Number(body.hargaJual), hargaModal: Number(body.hargaModal),
      stokBagus: Number(body.stokBagus), stokRusak: Number(body.stokRusak),
      minStok: Number(body.minStok), kategoriId: body.kategoriId,
      supplierId: body.supplierId || null,
    },
  })
  return json(barang, true, "Barang berhasil diperbarui")
}

// DELETE /api/barang/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)
  const { id } = await params

  await prisma.barang.delete({ where: { id } })
  return json(null, true, "Barang berhasil dihapus")
}
