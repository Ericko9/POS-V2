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
  try {
    const session = await auth()
    if (!session) return json(null, false, "Unauthorized", 401)
    if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)
    const { id } = await params

    const body = await req.json()

    const nama = body.nama
    const grade = body.grade
    const hargaJual = Number(body.hargaJual)
    const hargaModal = Number(body.hargaModal || 0)
    const stokBagus = Number(body.stokBagus || 0)
    const stokRusak = Number(body.stokRusak || 0)
    const minStok = Number(body.minStok || 5)
    const fotoUrl = body.fotoUrl || null
    const kategoriId = body.kategoriId
    const supplierId = body.supplierId || null

    if (!nama || !kategoriId) {
      return json(null, false, "Nama dan Kategori wajib diisi", 400)
    }

    if (isNaN(hargaJual) || isNaN(hargaModal) || isNaN(stokBagus) || isNaN(stokRusak) || isNaN(minStok)) {
      return json(null, false, "Format angka tidak valid", 400)
    }

    const barang = await prisma.barang.update({
      where: { id },
      data: {
        nama, grade,
        hargaJual, hargaModal,
        stokBagus, stokRusak,
        minStok, fotoUrl, kategoriId,
        supplierId,
      },
    })
    return json(barang, true, "Barang berhasil diperbarui")
  } catch (error: any) {
    console.error("PUT /api/barang/[id] Error:", error)
    return json(null, false, error.message || "Internal Server Error", 500)
  }
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
