import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

export async function GET() {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)

  const [revenue, costData, returData] = await Promise.all([
    prisma.nota.aggregate({ _sum: { totalHarga: true } }),
    prisma.$queryRaw<[{ totalModal: number; totalDiskon: number }]>`
      SELECT COALESCE(SUM(b."hargaModal" * i.jumlah), 0)::float as "totalModal",
             COALESCE(SUM(i.diskon * i.jumlah), 0)::float as "totalDiskon"
      FROM "ItemNota" i
      JOIN "Barang" b ON b.id = i."barangId"
    `,
    prisma.retur.aggregate({ _sum: { totalNilai: true } }),
  ])

  const totalPendapatan = revenue._sum.totalHarga || 0
  const totalModal = costData[0]?.totalModal || 0
  const totalDiskon = costData[0]?.totalDiskon || 0
  const totalRetur = returData._sum.totalNilai || 0
  const labaBersih = totalPendapatan - totalModal - totalRetur

  return json({ totalPendapatan, totalModal, totalDiskon, totalRetur, labaBersih })
}
