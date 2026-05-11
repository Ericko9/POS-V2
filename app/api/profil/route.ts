import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

// GET profile
export async function GET() {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)

  const [user, toko] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, nama: true, username: true, email: true, noHp: true, role: true },
    }),
    prisma.profilToko.findFirst(),
  ])

  return json({ user, toko })
}

// PUT update profile
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)

  const body = await req.json()
  const { type } = body

  if (type === "user") {
    const data: Record<string, unknown> = { nama: body.nama, email: body.email, noHp: body.noHp }
    if (body.password) {
      data.password = await bcrypt.hash(body.password, 12)
    }
    const user = await prisma.user.update({
      where: { id: session.user.id }, data,
      select: { id: true, nama: true, username: true, email: true, noHp: true },
    })
    return json(user, true, "Profil berhasil diperbarui")
  }

  if (type === "toko") {
    if ((session.user as { role?: string }).role !== "ADMIN") return json(null, false, "Forbidden", 403)
    const existing = await prisma.profilToko.findFirst()
    const tokoData = { namaToko: body.namaToko, alamat: body.alamat, noTelp: body.noTelp, email: body.emailToko }
    
    const toko = existing
      ? await prisma.profilToko.update({ where: { id: existing.id }, data: tokoData })
      : await prisma.profilToko.create({ data: tokoData })
    
    return json(toko, true, "Profil toko berhasil diperbarui")
  }

  return json(null, false, "Invalid type", 400)
}
