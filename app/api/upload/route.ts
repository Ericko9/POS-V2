import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import sharp from "sharp"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Tidak ada file yang diunggah" },
        { status: 400 }
      )
    }

    // Validasi tipe file
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, message: "File harus berupa gambar" },
        { status: 400 }
      )
    }

    // Konversi file ke Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Pastikan folder public/uploads sudah dibuat
    const uploadDir = path.join(process.cwd(), "public", "uploads")
    try {
      await fs.mkdir(uploadDir, { recursive: true })
    } catch {
      // Folder sudah ada
    }

    // Buat nama file unik dengan ekstensi webp
    const filename = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}.webp`
    const filePath = path.join(uploadDir, filename)

    // Kompresi dan ubah ukuran gambar menggunakan sharp:
    // - Ubah format ke webp dengan kualitas 75%
    // - Batasi lebar maksimal 800px (tinggi proporsional)
    // - Tanpa memperbesar gambar asli jika ukurannya sudah lebih kecil
    await sharp(buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(filePath)

    const fileUrl = `/uploads/${filename}`

    return NextResponse.json({ success: true, url: fileUrl })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat mengunggah foto" },
      { status: 500 }
    )
  }
}
