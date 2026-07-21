import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

function json(data: unknown, success = true, message = "OK", status = 200) {
  return NextResponse.json({ success, data, message }, { status })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return json(null, false, "Unauthorized", 401)

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return json(null, false, "Tidak ada file yang diunggah", 400)
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads", "bukti")
    await mkdir(uploadDir, { recursive: true })

    // Create unique filename
    const ext = path.extname(file.name) || ".jpg"
    const filename = `bukti-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`
    const filepath = path.join(uploadDir, filename)

    await writeFile(filepath, buffer)

    const url = `/uploads/bukti/${filename}`
    return json({ url }, true, "Foto berhasil diunggah", 201)
  } catch (error) {
    console.error("Upload error:", error)
    return json(null, false, "Gagal mengunggah foto", 500)
  }
}
