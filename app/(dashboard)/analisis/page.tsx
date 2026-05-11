"use client"
import { useState, useEffect } from "react"
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users as UsersIcon, PieChart, Download, FileSpreadsheet, FileText, Calendar } from "lucide-react"
import { formatRupiah } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"

type Tab = "pendapatan" | "kategori" | "pelanggan" | "laba"

interface PendapatanData {
  totalPendapatan: number
  pendapatanSebelumnya: number
  persentasePerubahan: number
  data: { tanggal: string; total: number }[]
}

interface KategoriData {
  kategori: string
  total: number
  jumlahItem: number
}

interface PelangganData {
  nama: string
  noHp: string
  jumlahNota: number
  totalBelanja: number
}

interface LabaData {
  totalPendapatan: number
  totalModal: number
  totalDiskon: number
  totalRetur: number
  labaBersih: number
}

export default function AnalisisPage() {
  const [tab, setTab] = useState<Tab>("pendapatan")
  const [pendapatan, setPendapatan] = useState<PendapatanData | null>(null)
  const [kategoriData, setKategoriData] = useState<KategoriData[]>([])
  const [pelanggan, setPelanggan] = useState<PelangganData[]>([])
  const [laba, setLaba] = useState<LabaData | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Date range state
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const [dateFrom, setDateFrom] = useState(firstOfMonth.toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(now.toISOString().slice(0, 10))

  const fetchTab = async (t: Tab) => {
    setLoading(true)
    const params = new URLSearchParams({ dari: dateFrom, sampai: dateTo })
    if (t === "pendapatan") { const r = await fetch(`/api/analisis/pendapatan?${params}`); const j = await r.json(); if (j.success) setPendapatan(j.data) }
    else if (t === "kategori") { const r = await fetch("/api/analisis/kategori"); const j = await r.json(); if (j.success) setKategoriData(j.data) }
    else if (t === "pelanggan") { const r = await fetch("/api/analisis/pelanggan"); const j = await r.json(); if (j.success) setPelanggan(j.data) }
    else if (t === "laba") { const r = await fetch("/api/analisis/laba"); const j = await r.json(); if (j.success) setLaba(j.data) }
    setLoading(false)
  }

  useEffect(() => { fetchTab(tab) }, [tab])

  const tabs = [
    { key: "pendapatan" as Tab, label: "Pendapatan", icon: DollarSign },
    { key: "kategori" as Tab, label: "Kategori", icon: PieChart },
    { key: "pelanggan" as Tab, label: "Pelanggan", icon: UsersIcon },
    { key: "laba" as Tab, label: "Laba", icon: BarChart3 },
  ]

  const tooltipStyle = { background: "#16161d", border: "1px solid #27272a", borderRadius: "12px", color: "#e4e4e7" }
  const fmtRp = (v: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v)

  // ========================================
  // Export Excel
  // ========================================
  const exportExcel = async () => {
    setExporting(true)
    try {
      const XLSX = await import("xlsx")
      let worksheetData: Record<string, unknown>[] = []
      let filename = ""

      if (tab === "pendapatan" && pendapatan) {
        worksheetData = pendapatan.data.map(d => ({
          Tanggal: d.tanggal,
          "Total Pendapatan": d.total,
        }))
        worksheetData.push({})
        worksheetData.push({ Tanggal: "Total Periode Ini", "Total Pendapatan": pendapatan.totalPendapatan })
        worksheetData.push({ Tanggal: "Periode Sebelumnya", "Total Pendapatan": pendapatan.pendapatanSebelumnya })
        worksheetData.push({ Tanggal: "Perubahan (%)", "Total Pendapatan": pendapatan.persentasePerubahan })
        filename = `Laporan_Pendapatan_${dateFrom}_${dateTo}.xlsx`
      } else if (tab === "kategori") {
        worksheetData = kategoriData.map(k => ({
          Kategori: k.kategori,
          "Total Penjualan": k.total,
          "Jumlah Item": k.jumlahItem,
        }))
        filename = `Laporan_Kategori_${dateFrom}_${dateTo}.xlsx`
      } else if (tab === "pelanggan") {
        worksheetData = pelanggan.map((p, i) => ({
          No: i + 1,
          "Nama Pelanggan": p.nama,
          "No. HP": p.noHp,
          "Jumlah Nota": p.jumlahNota,
          "Total Belanja": p.totalBelanja,
        }))
        filename = `Laporan_Pelanggan_${dateFrom}_${dateTo}.xlsx`
      } else if (tab === "laba" && laba) {
        worksheetData = [
          { Keterangan: "Total Pendapatan", Jumlah: laba.totalPendapatan },
          { Keterangan: "Total Modal", Jumlah: laba.totalModal },
          { Keterangan: "Total Diskon", Jumlah: laba.totalDiskon },
          { Keterangan: "Total Retur", Jumlah: laba.totalRetur },
          { Keterangan: "Laba Bersih", Jumlah: laba.labaBersih },
        ]
        filename = `Laporan_Laba_${dateFrom}_${dateTo}.xlsx`
      }

      if (worksheetData.length === 0) { setExporting(false); return }

      const ws = XLSX.utils.json_to_sheet(worksheetData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Laporan")

      // Auto-size columns
      const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
        wch: Math.max(key.length, ...worksheetData.map(r => String(r[key] || "").length)) + 2
      }))
      ws["!cols"] = colWidths

      XLSX.writeFile(wb, filename)
    } catch (err) {
      console.error("Export Excel error:", err)
      alert("Gagal mengexport Excel")
    }
    setExporting(false)
  }

  // ========================================
  // Export PDF
  // ========================================
  const exportPDF = async () => {
    setExporting(true)
    try {
      const { default: ReactPDF, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer")

      const styles = StyleSheet.create({
        page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
        title: { fontSize: 18, fontWeight: "bold", marginBottom: 6, textAlign: "center" },
        subtitle: { fontSize: 10, color: "#666", marginBottom: 20, textAlign: "center" },
        table: { width: "100%", marginTop: 10 },
        tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ddd", paddingVertical: 6 },
        tableHeader: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: "#333", paddingBottom: 6, marginBottom: 2 },
        cellWide: { flex: 2, paddingHorizontal: 4 },
        cell: { flex: 1, paddingHorizontal: 4 },
        cellRight: { flex: 1, paddingHorizontal: 4, textAlign: "right" },
        bold: { fontWeight: "bold" },
        summaryRow: { flexDirection: "row", paddingVertical: 8, marginTop: 10, borderTopWidth: 2, borderTopColor: "#333" },
        footer: { marginTop: 30, fontSize: 8, color: "#999", textAlign: "center" },
      })

      let title = ""
      let tableRows: React.ReactNode[] = []
      let headerRow: React.ReactNode = null
      let summarySection: React.ReactNode = null

      if (tab === "pendapatan" && pendapatan) {
        title = "Laporan Pendapatan"
        headerRow = (
          <View style={styles.tableHeader}>
            <Text style={[styles.cellWide, styles.bold]}>Tanggal</Text>
            <Text style={[styles.cellRight, styles.bold]}>Total Pendapatan</Text>
          </View>
        )
        tableRows = pendapatan.data.map((d, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.cellWide}>{d.tanggal}</Text>
            <Text style={styles.cellRight}>{fmtRp(d.total)}</Text>
          </View>
        ))
        summarySection = (
          <View>
            <View style={styles.summaryRow}>
              <Text style={[styles.cellWide, styles.bold]}>Total Periode Ini</Text>
              <Text style={[styles.cellRight, styles.bold]}>{fmtRp(pendapatan.totalPendapatan)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.cellWide}>Periode Sebelumnya</Text>
              <Text style={styles.cellRight}>{fmtRp(pendapatan.pendapatanSebelumnya)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.cellWide}>Perubahan</Text>
              <Text style={styles.cellRight}>{pendapatan.persentasePerubahan}%</Text>
            </View>
          </View>
        )
      } else if (tab === "kategori") {
        title = "Laporan Penjualan per Kategori"
        headerRow = (
          <View style={styles.tableHeader}>
            <Text style={[styles.cellWide, styles.bold]}>Kategori</Text>
            <Text style={[styles.cellRight, styles.bold]}>Total Penjualan</Text>
            <Text style={[styles.cellRight, styles.bold]}>Jumlah Item</Text>
          </View>
        )
        tableRows = kategoriData.map((k, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.cellWide}>{k.kategori}</Text>
            <Text style={styles.cellRight}>{fmtRp(k.total)}</Text>
            <Text style={styles.cellRight}>{k.jumlahItem}</Text>
          </View>
        ))
      } else if (tab === "pelanggan") {
        title = "Laporan Top 10 Pelanggan"
        headerRow = (
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.bold]}>#</Text>
            <Text style={[styles.cellWide, styles.bold]}>Nama</Text>
            <Text style={[styles.cell, styles.bold]}>No. HP</Text>
            <Text style={[styles.cellRight, styles.bold]}>Nota</Text>
            <Text style={[styles.cellRight, styles.bold]}>Total</Text>
          </View>
        )
        tableRows = pelanggan.map((p, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.cell}>{i + 1}</Text>
            <Text style={styles.cellWide}>{p.nama}</Text>
            <Text style={styles.cell}>{p.noHp}</Text>
            <Text style={styles.cellRight}>{p.jumlahNota}</Text>
            <Text style={styles.cellRight}>{fmtRp(p.totalBelanja)}</Text>
          </View>
        ))
      } else if (tab === "laba" && laba) {
        title = "Laporan Laba Rugi"
        headerRow = (
          <View style={styles.tableHeader}>
            <Text style={[styles.cellWide, styles.bold]}>Keterangan</Text>
            <Text style={[styles.cellRight, styles.bold]}>Jumlah</Text>
          </View>
        )
        tableRows = [
          { label: "Total Pendapatan", value: laba.totalPendapatan },
          { label: "Total Modal", value: laba.totalModal },
          { label: "Total Diskon", value: laba.totalDiskon },
          { label: "Total Retur", value: laba.totalRetur },
        ].map((row, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.cellWide}>{row.label}</Text>
            <Text style={styles.cellRight}>{fmtRp(row.value)}</Text>
          </View>
        ))
        summarySection = (
          <View style={styles.summaryRow}>
            <Text style={[styles.cellWide, styles.bold]}>Laba Bersih</Text>
            <Text style={[styles.cellRight, styles.bold]}>{fmtRp(laba.labaBersih)}</Text>
          </View>
        )
      }

      const PdfDoc = (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Periode: {dateFrom} s/d {dateTo}</Text>
            <View style={styles.table}>
              {headerRow}
              {tableRows}
              {summarySection}
            </View>
            <Text style={styles.footer}>
              Dicetak pada: {new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </Text>
          </Page>
        </Document>
      )

      const blob = await ReactPDF.pdf(PdfDoc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Laporan_${tab}_${dateFrom}_${dateTo}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Export PDF error:", err)
      alert("Gagal mengexport PDF")
    }
    setExporting(false)
  }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="page-header"><div><h1 className="page-title flex items-center gap-2"><BarChart3 className="w-7 h-7 text-primary" /> Analisis & Laporan</h1></div></div>

      {/* Tab buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(t => {
          const Icon = t.icon
          return <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? "btn-primary btn-sm" : "btn-secondary btn-sm"}><Icon className="w-4 h-4" /> {t.label}</button>
        })}
      </div>

      {/* Date range picker + Export buttons */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-muted shrink-0" />
            <label className="text-sm text-muted-foreground">Dari:</label>
            <input type="date" className="input-field w-auto py-1.5 px-3 text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <label className="text-sm text-muted-foreground">Sampai:</label>
            <input type="date" className="input-field w-auto py-1.5 px-3 text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            <button onClick={() => fetchTab(tab)} className="btn-primary btn-sm">Terapkan</button>
          </div>
          <div className="flex gap-2 sm:ml-auto">
            <button onClick={exportExcel} disabled={exporting || loading} className="btn-secondary btn-sm">
              <FileSpreadsheet className="w-4 h-4 text-success" /> Excel
            </button>
            <button onClick={exportPDF} disabled={exporting || loading} className="btn-secondary btn-sm">
              <FileText className="w-4 h-4 text-danger" /> PDF
            </button>
          </div>
        </div>
      </div>

      {loading ? <div className="card text-center py-12 text-muted">Memuat...</div> : (
        <>
          {tab === "pendapatan" && pendapatan && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="stat-card"><p className="stat-label">Pendapatan Periode Ini</p><p className="stat-value text-success">{formatRupiah(pendapatan.totalPendapatan)}</p></div>
                <div className="stat-card"><p className="stat-label">Periode Sebelumnya</p><p className="stat-value text-muted-foreground">{formatRupiah(pendapatan.pendapatanSebelumnya)}</p></div>
                <div className="stat-card"><p className="stat-label">Perubahan</p><p className={`stat-value flex items-center gap-1 ${pendapatan.persentasePerubahan >= 0 ? "text-success" : "text-danger"}`}>{pendapatan.persentasePerubahan >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}{pendapatan.persentasePerubahan}%</p></div>
              </div>
              <div className="card"><h2 className="font-semibold mb-4">Grafik Pendapatan Harian</h2>
                <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={pendapatan.data}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="tanggal" tick={{ fill: "#71717a", fontSize: 10 }} /><YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(1)}jt` : `${(v/1e3).toFixed(0)}rb`} /><Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmtRp(v as number), "Pendapatan"]} /><Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1" }} /></LineChart></ResponsiveContainer></div>
              </div>
            </div>
          )}

          {tab === "kategori" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card"><h2 className="font-semibold mb-4">Penjualan per Kategori</h2>
                <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={kategoriData}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="kategori" tick={{ fill: "#71717a", fontSize: 11 }} /><YAxis tick={{ fill: "#71717a", fontSize: 10 }} /><Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmtRp(v as number), "Total"]} /><Bar dataKey="total" fill="#8b5cf6" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
              </div>
              <div className="card"><h2 className="font-semibold mb-4">Detail</h2>
                <div className="space-y-3">{kategoriData.map((k, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-input"><div><p className="font-medium">{k.kategori}</p><p className="text-xs text-muted">{k.jumlahItem} item terjual</p></div><p className="font-bold">{formatRupiah(k.total)}</p></div>
                ))}</div>
              </div>
            </div>
          )}

          {tab === "pelanggan" && (
            <div className="card"><h2 className="font-semibold mb-4">Top 10 Pelanggan</h2>
              <div className="table-container"><table className="table-base"><thead><tr><th>#</th><th>Nama</th><th>No. HP</th><th>Jumlah Nota</th><th>Total Belanja</th></tr></thead>
                <tbody>{pelanggan.map((p, i) => <tr key={i}><td>{i + 1}</td><td className="font-medium">{p.nama}</td><td className="text-muted-foreground">{p.noHp}</td><td>{p.jumlahNota}</td><td className="font-bold">{formatRupiah(p.totalBelanja)}</td></tr>)}</tbody>
              </table></div>
            </div>
          )}

          {tab === "laba" && laba && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card"><p className="stat-label">Total Pendapatan</p><p className="stat-value text-success">{formatRupiah(laba.totalPendapatan)}</p></div>
                <div className="stat-card"><p className="stat-label">Total Modal</p><p className="stat-value text-warning">{formatRupiah(laba.totalModal)}</p></div>
                <div className="stat-card"><p className="stat-label">Total Retur</p><p className="stat-value text-danger">{formatRupiah(laba.totalRetur)}</p></div>
                <div className="stat-card border-primary/30"><p className="stat-label">Laba Bersih</p><p className={`stat-value ${laba.labaBersih >= 0 ? "text-success" : "text-danger"}`}>{formatRupiah(laba.labaBersih)}</p></div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
