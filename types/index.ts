import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    role?: string
  }

  interface Session {
    user: {
      id: string
      name: string
      role: string
      email?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    id?: string
  }
}

// API Response type
export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  message: string
}

// Dashboard types
export interface DashboardData {
  totalHariIni: number
  totalMingguIni: number
  totalBulanIni: number
  jumlahNota: number
  stokMenipis: StokMenipisItem[]
  transaksiTerbaru: TransaksiTerbaru[]
  grafikMingguan: GrafikData[]
}

export interface StokMenipisItem {
  id: string
  nama: string
  grade: string
  stokBagus: number
  minStok: number
  kategori: string
}

export interface TransaksiTerbaru {
  id: string
  nomorNota: string
  namaPelanggan: string
  totalHarga: number
  createdAt: string
  kasir: string
}

export interface GrafikData {
  tanggal: string
  total: number
}

// Analisis types
export interface AnalisisPendapatan {
  totalPendapatan: number
  pendapatanSebelumnya: number
  persentasePerubahan: number
  data: { tanggal: string; total: number }[]
}

export interface AnalisisKategori {
  kategori: string
  total: number
  jumlahItem: number
}

export interface AnalisisPelanggan {
  nama: string
  noHp: string
  jumlahNota: number
  totalBelanja: number
}

export interface AnalisisLaba {
  totalPendapatan: number
  totalModal: number
  totalDiskon: number
  totalRetur: number
  labaBersih: number
}
