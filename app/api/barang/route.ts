import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

// GET /api/barang - List all products
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)

  const { searchParams } = new URL(req.url)
  const kategori = searchParams.get("kategori")
  const search = searchParams.get("search")
  const stokMenipis = searchParams.get("stokMenipis")

  const where: Record<string, unknown> = {}
  if (kategori) where.kategoriId = kategori
  if (search) where.nama = { contains: search, mode: "insensitive" }

  const barang = await prisma.barang.findMany({
    where,
    include: {
      kategori: { select: { nama: true } },
      supplier: { select: { nama: true } },
      promo: {
        where: { tanggalMulai: { lte: new Date() }, tanggalAkhir: { gte: new Date() } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  let result = barang
  if (stokMenipis === "true") {
    result = barang.filter(b => b.stokBagus <= b.minStok)
  }

  return json(result)
}

// POST /api/barang - Create new product (Admin only)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)

  const body = await req.json()
  const { nama, grade, hargaJual, hargaModal, stokBagus, stokRusak, minStok, fotoUrl, kategoriId, supplierId } = body

  if (!nama || !grade || !hargaJual || !kategoriId) {
    return json(null, false, "Data tidak lengkap", 400)
  }

  const barang = await prisma.barang.create({
    data: {
      nama, grade, hargaJual: Number(hargaJual), hargaModal: Number(hargaModal || 0),
      stokBagus: Number(stokBagus || 0), stokRusak: Number(stokRusak || 0),
      minStok: Number(minStok || 5), fotoUrl: fotoUrl || null, kategoriId, supplierId: supplierId || null,
    },
    include: { kategori: true, supplier: true },
  })

  return json(barang, true, "Barang berhasil ditambahkan", 201)
}
