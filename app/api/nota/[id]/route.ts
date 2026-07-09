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

  const nota = await prisma.nota.findUnique({
    where: { id },
    include: {
      kasir: { select: { nama: true } },
      kurir: { select: { id: true, nama: true, noHp: true } },
      items: { include: { barang: { select: { nama: true, grade: true } } } },
      retur: { include: { items: { include: { barang: { select: { nama: true } } } } } },
    },
  })
  if (!nota) return json(null, false, "Nota tidak ditemukan", 404)
  return json(nota)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)
  const { id } = await params

  const nota = await prisma.nota.findUnique({
    where: { id }, include: { items: true },
  })
  if (!nota) return json(null, false, "Nota tidak ditemukan", 404)

  await prisma.$transaction(async (tx) => {
    for (const item of nota.items) {
      await tx.barang.update({
        where: { id: item.barangId },
        data: {
          stokBagus: { increment: item.jumlah },
          jumlahTerjual: { decrement: item.jumlah },
        },
      })
    }
    await tx.nota.delete({ where: { id } })
  })

  return json(null, true, "Nota berhasil dihapus")
}
