import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

export async function GET() {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)

  try {
    const listCouriers = await prisma.user.findMany({
      where: { role: "KURIR", aktif: true },
      select: { id: true, nama: true, noHp: true, username: true },
      orderBy: { nama: "asc" },
    })

    return json(listCouriers)
  } catch (error) {
    console.error("GET /api/kurir error:", error)
    return json(null, false, "Gagal mengambil data kurir", 500)
  }
}
