import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)

  const { searchParams } = new URL(req.url)
  const dari = searchParams.get("dari")
  const sampai = searchParams.get("sampai")

  const now = new Date()
  const startDate = dari ? new Date(dari) : new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = sampai ? new Date(sampai) : now

  const duration = endDate.getTime() - startDate.getTime()
  const prevStart = new Date(startDate.getTime() - duration)
  const prevEnd = new Date(startDate.getTime() - 1)

  const [current, previous] = await Promise.all([
    prisma.nota.aggregate({ _sum: { totalHarga: true }, where: { createdAt: { gte: startDate, lte: endDate } } }),
    prisma.nota.aggregate({ _sum: { totalHarga: true }, where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
  ])

  const totalCurrent = current._sum.totalHarga || 0
  const totalPrevious = previous._sum.totalHarga || 0
  const persentase = totalPrevious > 0 ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 : 0

  // Daily breakdown
  const days = []
  const d = new Date(startDate)
  while (d <= endDate) {
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999)
    const total = await prisma.nota.aggregate({
      _sum: { totalHarga: true },
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
    })
    days.push({ tanggal: d.toISOString().slice(0, 10), total: total._sum.totalHarga || 0 })
    d.setDate(d.getDate() + 1)
  }

  return json({
    totalPendapatan: totalCurrent,
    pendapatanSebelumnya: totalPrevious,
    persentasePerubahan: Math.round(persentase * 100) / 100,
    data: days,
  })
}
