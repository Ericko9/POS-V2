import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)
  const { id } = await params
  const { statusPengiriman } = await req.json()

  const nota = await prisma.nota.update({
    where: { id },
    data: { statusPengiriman },
  })
  return json(nota, true, "Status pengiriman diperbarui")
}
