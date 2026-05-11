import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

export async function GET() {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)

  const retur = await prisma.retur.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      nota: { select: { nomorNota: true, namaPelanggan: true } },
      items: { include: { barang: { select: { nama: true, grade: true } } } },
    },
  })
  return json(retur)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)

  const body = await req.json()
  const { notaId, alasan, items } = body

  if (!notaId || !alasan || !items || items.length === 0) {
    return json(null, false, "Data retur tidak lengkap", 400)
  }

  // Validate nota exists and items
  const nota = await prisma.nota.findUnique({
    where: { id: notaId },
    include: { items: true },
  })
  if (!nota) return json(null, false, "Nota tidak ditemukan", 404)

  for (const item of items) {
    const notaItem = nota.items.find(ni => ni.barangId === item.barangId)
    if (!notaItem) return json(null, false, "Barang tidak ada di nota ini", 400)
    if (item.jumlah > notaItem.jumlah) return json(null, false, "Jumlah retur melebihi jumlah beli", 400)
  }

  let totalNilai = 0
  const itemsData: any[] = []

  for (const item of items) {
    const notaItem = nota.items.find(ni => ni.barangId === item.barangId)!
    const nilaiKembali = item.kondisi === "BAGUS" ? (notaItem.hargaSatuan - notaItem.diskon) * item.jumlah : 0
    totalNilai += nilaiKembali
    itemsData.push({
      barangId: item.barangId, jumlah: item.jumlah,
      kondisi: item.kondisi, nilaiKembali,
    })
  }

  const retur = await prisma.$transaction(async (tx) => {
    const created = await tx.retur.create({
      data: { notaId, alasan, totalNilai, items: { create: itemsData } },
      include: { items: true },
    })

    for (const item of itemsData) {
      if (item.kondisi === "BAGUS") {
        await tx.barang.update({
          where: { id: item.barangId },
          data: { stokBagus: { increment: item.jumlah }, jumlahTerjual: { decrement: item.jumlah } },
        })
      } else {
        await tx.barang.update({
          where: { id: item.barangId },
          data: { stokRusak: { increment: item.jumlah }, jumlahTerjual: { decrement: item.jumlah } },
        })
      }
    }

    return created
  })

  return json(retur, true, "Retur berhasil diproses", 201)
}
