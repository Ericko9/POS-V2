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

  const result = await prisma.$queryRaw<Array<{ kategori: string; total: number; jumlahItem: number }>>`
    SELECT k.nama as kategori, COALESCE(SUM(i.subtotal), 0)::float as total, COALESCE(SUM(i.jumlah), 0)::int as "jumlahItem"
    FROM "Kategori" k
    LEFT JOIN "Barang" b ON b."kategoriId" = k.id
    LEFT JOIN "ItemNota" i ON i."barangId" = b.id
    GROUP BY k.nama
    ORDER BY total DESC
  `
  return json(result)
}
