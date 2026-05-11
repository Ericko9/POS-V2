import "dotenv/config"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { prisma } from "../lib/db"

async function main() {
  console.log("🌱 Resetting and seeding database...")

  // ==========================================
  // 1. Create Admin User
  // ==========================================
  const adminPassword = await bcrypt.hash("erickoajah03", 12)
  const admin = await prisma.user.upsert({
    where: { username: "erickowic03" },
    update: {
      password: adminPassword,
      role: Role.ADMIN,
      aktif: true,
    },
    create: {
      nama: "Administrator",
      username: "erickowic03",
      email: "admin@toko.com",
      noHp: "081234567890",
      password: adminPassword,
      role: Role.ADMIN,
      aktif: true,
      catatan: "Akun admin utama",
    },
  })
  console.log(`  ✅ Admin: ${admin.username}`)

  // ==========================================
  // 2. Create Profil Toko (Required for UI)
  // ==========================================
  const existingToko = await prisma.profilToko.findFirst()
  if (!existingToko) {
    await prisma.profilToko.create({
      data: {
        namaToko: "Toko POS",
        alamat: "Alamat Toko Anda",
        noTelp: "08123456789",
        email: "info@tokopos.com",
      },
    })
  }
  console.log(`  ✅ Profil Toko`)

  console.log("")
  console.log("🎉 Seeding selesai!")
  console.log("")
  console.log("📋 Akun yang tersedia:")
  console.log("   Admin  → username: erickowic03   | password: erickoajah03")
  console.log("")
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("❌ Error:", e)
    prisma.$disconnect()
    process.exit(1)
  })
