import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateNomorNota, getStartOfDay, getEndOfDay } from "@/lib/utils"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")
  const tanggalMulai = searchParams.get("tanggalMulai")
  const tanggalAkhir = searchParams.get("tanggalAkhir")
  const role = (session.user as { role?: string }).role

  const where: Record<string, any> = {}
  if (role === "KASIR") where.kasirId = session.user.id
  if (role === "KURIR") where.kurirId = session.user.id
  if (search) {
    where.OR = [
      { nomorNota: { contains: search, mode: "insensitive" } },
      { namaPelanggan: { contains: search, mode: "insensitive" } },
    ]
  }
  if (tanggalMulai && tanggalAkhir) {
    where.createdAt = { gte: new Date(tanggalMulai), lte: getEndOfDay(new Date(tanggalAkhir)) }
  }

  const nota = await prisma.nota.findMany({
    where, orderBy: { createdAt: "desc" },
    include: {
      kasir: { select: { nama: true } },
      _count: { select: { items: true, retur: true } },
    },
  })
  return json(nota)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)

  const body = await req.json()
  const { namaPelanggan, noHpPelanggan, alamatPelanggan, catatan, items } = body

  if (!namaPelanggan || !items || items.length === 0) {
    return json(null, false, "Data nota tidak lengkap", 400)
  }

  // Validate stock
  for (const item of items) {
    const barang = await prisma.barang.findUnique({ where: { id: item.barangId } })
    if (!barang) return json(null, false, `Barang tidak ditemukan`, 400)
    if (barang.stokBagus < item.jumlah) return json(null, false, `Stok ${barang.nama} tidak mencukupi (sisa: ${barang.stokBagus})`, 400)
  }

  // Generate nota number
  const now = new Date()
  const todayCount = await prisma.nota.count({
    where: { createdAt: { gte: getStartOfDay(now), lte: getEndOfDay(now) } },
  })
  const nomorNota = generateNomorNota(now, todayCount + 1)

  // Calculate totals and check promos
  let totalHarga = 0
  const itemsData: any[] = []
  for (const item of items) {
    const barang = await prisma.barang.findUnique({
      where: { id: item.barangId },
      include: {
        promo: {
          where: { tanggalMulai: { lte: now }, tanggalAkhir: { gte: now } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })
    if (!barang) continue

    const diskon = barang.promo.length > 0 ? barang.promo[0].diskon : 0
    const hargaSatuan = barang.hargaJual
    const subtotal = (hargaSatuan - diskon) * item.jumlah

    itemsData.push({
      barangId: item.barangId, jumlah: item.jumlah,
      hargaSatuan, diskon, subtotal,
    })
    totalHarga += subtotal
  }

  // Transaction: create nota, update stock
  const nota = await prisma.$transaction(async (tx) => {
    const createdNota = await tx.nota.create({
      data: {
        nomorNota, namaPelanggan, noHpPelanggan, alamatPelanggan, catatan,
        totalHarga, kasirId: session.user.id,
        items: { create: itemsData },
      },
      include: { items: true, kasir: { select: { nama: true } } },
    })

    for (const item of itemsData) {
      await tx.barang.update({
        where: { id: item.barangId },
        data: {
          stokBagus: { decrement: item.jumlah },
          jumlahTerjual: { increment: item.jumlah },
        },
      })
    }

    return createdNota
  })

  return json(nota, true, "Nota berhasil dibuat", 201)
}
