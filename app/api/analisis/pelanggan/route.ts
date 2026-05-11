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

  const result = await prisma.$queryRaw<Array<{ nama: string; noHp: string; jumlahNota: number; totalBelanja: number }>>`
    SELECT "namaPelanggan" as nama, COALESCE("noHpPelanggan", '-') as "noHp",
      COUNT(*)::int as "jumlahNota", SUM("totalHarga")::float as "totalBelanja"
    FROM "Nota"
    GROUP BY "namaPelanggan", "noHpPelanggan"
    ORDER BY "totalBelanja" DESC
    LIMIT 10
  `
  return json(result)
}
