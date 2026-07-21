"use client"
import { useState, useEffect, use, useRef } from "react"
import { ArrowLeft, Printer, Truck, FileText, Trash2, Send, Camera, Upload, X, CheckCircle, RefreshCw } from "lucide-react"
import Link from "next/link"
import { formatRupiah, formatDateTime } from "@/lib/utils"
import CetakNota from "@/components/nota/CetakNota"
import CetakSuratJalan from "@/components/nota/CetakSuratJalan"

interface NotaDetail {
  id: string; nomorNota: string; namaPelanggan: string; noHpPelanggan: string | null;
  alamatPelanggan: string | null; catatan: string | null; totalHarga: number;
  statusPengiriman: string; fotoBuktiUrl?: string | null; createdAt: string;
  kasir: { nama: string };
  kurir?: { id: string; nama: string; noHp: string | null } | null;
  items: { id: string; jumlah: number; hargaSatuan: number; diskon: number; subtotal: number; barang: { nama: string; grade: string } }[];
  retur: { id: string; alasan: string; totalNilai: number; createdAt: string; items: { jumlah: number; kondisi: string; nilaiKembali: number; barang: { nama: string } }[] }[];
}

interface ProfilToko {
  namaToko: string; alamat: string | null; noTelp: string | null; email: string | null;
}

export default function DetailNotaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [nota, setNota] = useState<NotaDetail | null>(null)
  const [toko, setToko] = useState<ProfilToko | null>(null)
  const [loading, setLoading] = useState(true)
  const [printMode, setPrintMode] = useState<"nota" | "sj" | "gabungan" | null>(null)
  const [userRole, setUserRole] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [couriers, setCouriers] = useState<any[]>([])
  const [waLoading, setWaLoading] = useState(false)

  // Upload & Camera state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // WebRTC camera state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(false)

  const printRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const fetchData = async () => {
    setLoading(true)
    const [notaRes, profilRes] = await Promise.all([
      fetch(`/api/nota/${id}`),
      fetch("/api/profil"),
    ])
    const notaJson = await notaRes.json()
    const profilJson = await profilRes.json()
    
    if (notaJson.success) setNota(notaJson.data)
    if (profilJson.success) {
      if (profilJson.data.toko) setToko(profilJson.data.toko)
      if (profilJson.data.user) {
        setUserRole(profilJson.data.user.role)
        setUserId(profilJson.data.user.id)
      }
    }

    // Fetch list of couriers via /api/kurir (accessible by Admin & Kasir)
    if (profilJson.success && (profilJson.data.user.role === "ADMIN" || profilJson.data.user.role === "KASIR")) {
      const kurirRes = await fetch("/api/kurir")
      const kurirJson = await kurirRes.json()
      if (kurirJson.success) {
        setCouriers(kurirJson.data)
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [id])

  // Stop camera stream when modal closes or component unmounts
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])

  const assignCourier = async (kurirId: string) => {
    const res = await fetch(`/api/nota/${id}/pengiriman`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kurirId: kurirId === "" ? null : kurirId })
    })
    const json = await res.json()
    if (json.success) {
      fetchData()
    } else {
      alert(json.message)
    }
  }

  const updatePengiriman = async (status: string, fotoBuktiUrl?: string) => {
    const payload: Record<string, unknown> = { statusPengiriman: status }
    if (fotoBuktiUrl) payload.fotoBuktiUrl = fotoBuktiUrl

    const res = await fetch(`/api/nota/${id}/pengiriman`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    const json = await res.json()
    if (json.success) {
      fetchData()
    } else {
      alert(json.message)
    }
  }

  // Camera handling functions
  const startCamera = async () => {
    setCameraError(false)
    setIsCameraActive(true)
    setSelectedFile(null)
    setFilePreview(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      })
      setCameraStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error("Camera access error:", err)
      setCameraError(true)
      setIsCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setIsCameraActive(false)
  }

  // Draw watermark on HTML5 Canvas
  const addWatermark = (imageSrc: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(imageSrc)
          return
        }

        canvas.width = img.width
        canvas.height = img.height

        // Draw original captured image
        ctx.drawImage(img, 0, 0)

        // Setup watermark text styles
        const fontSize = Math.max(14, Math.floor(canvas.width * 0.025))
        ctx.font = `bold ${fontSize}px sans-serif`

        const now = new Date()
        const formattedDate = now.toLocaleString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).replace(/\./g, ":")

        const watermarkText = `BUKTI PENGIRIMAN LIVE | ${formattedDate}`

        // Calculate size & position for watermark background
        const textWidth = ctx.measureText(watermarkText).width
        const paddingX = fontSize * 0.8
        const paddingY = fontSize * 0.5
        const x = canvas.width - textWidth - paddingX - 10
        const y = canvas.height - paddingY - 10

        // Draw semi-transparent black background box
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
        ctx.fillRect(
          x - paddingX / 2,
          y - fontSize * 1.1,
          textWidth + paddingX,
          fontSize * 1.6
        )

        // Draw watermark white text
        ctx.fillStyle = "#ffffff"
        ctx.fillText(watermarkText, x, y)

        resolve(canvas.toDataURL("image/jpeg", 0.85))
      }
      img.onerror = (e) => reject(e)
      img.src = imageSrc
    })
  }

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (ctx) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        const rawDataUrl = canvas.toDataURL("image/jpeg")
        try {
          const watermarkedDataUrl = await addWatermark(rawDataUrl)
          setFilePreview(watermarkedDataUrl)

          // Convert watermarked data URL back to file
          const blob = await (await fetch(watermarkedDataUrl)).blob()
          const file = new File([blob], `bukti-${Date.now()}.jpg`, { type: "image/jpeg" })
          setSelectedFile(file)

          stopCamera()
        } catch (err) {
          console.error("Watermark overlay error:", err)
        }
      }
    }
  }

  // Fallback handler for standard input with mobile camera mode (capture="environment")
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const rawDataUrl = event.target?.result as string
        try {
          const watermarkedDataUrl = await addWatermark(rawDataUrl)
          setFilePreview(watermarkedDataUrl)

          const blob = await (await fetch(watermarkedDataUrl)).blob()
          const watermarkedFile = new File([blob], file.name, { type: file.type })
          setSelectedFile(watermarkedFile)
        } catch (err) {
          console.error("Watermark input file error:", err)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleOpenUploadModal = () => {
    setShowUploadModal(true)
    startCamera()
  }

  const handleCloseUploadModal = () => {
    stopCamera()
    setShowUploadModal(false)
    setSelectedFile(null)
    setFilePreview(null)
  }

  const handleConfirmReceived = async () => {
    if (!selectedFile) {
      alert("Harap ambil foto bukti penerimaan terlebih dahulu")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const uploadJson = await uploadRes.json()

      if (uploadJson.success) {
        await updatePengiriman("SUDAH_SAMPAI", uploadJson.data.url)
        handleCloseUploadModal()
      } else {
        alert("Gagal mengunggah foto: " + uploadJson.message)
      }
    } catch (err) {
      alert("Terjadi kesalahan saat memproses penerimaan")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Hapus nota ini? Stok akan dikembalikan.")) return
    const r = await fetch(`/api/nota/${id}`, { method: "DELETE" })
    const j = await r.json()
    if (j.success) window.location.href = "/nota"
    else alert(j.message)
  }

  const handlePrint = (mode: "nota" | "sj" | "gabungan") => {
    setPrintMode(mode)
    setTimeout(() => window.print(), 300)
  }

  const sendWhatsAppApi = async () => {
    setWaLoading(true)
    try {
      const res = await fetch(`/api/nota/${id}/whatsapp`, { method: "POST" })
      const json = await res.json()
      alert(json.message)
    } catch (e) {
      alert("Terjadi kesalahan jaringan")
    } finally {
      setWaLoading(false)
    }
  }

  const openWhatsAppManual = () => {
    if (!nota) return
    const namaToko = toko?.namaToko || "Toko POS"
    let statusText = "Belum Dikirim"
    if (nota.statusPengiriman === "AKAN_DIKIRIM") statusText = "Akan Dikirim / Di Perjalanan"
    if (nota.statusPengiriman === "SUDAH_SAMPAI") statusText = "Sudah Sampai / Diterima"

    let itemDetails = ""
    nota.items.forEach((item) => {
      const discInfo = item.diskon > 0 ? ` (disc: -${formatRupiah(item.diskon)})` : ""
      itemDetails += `- *${item.barang.nama}* (Grade ${item.barang.grade}) x ${item.jumlah} = *${formatRupiah(item.subtotal)}*${discInfo}\n`
    })

    const pesan = `Halo Kak *${nota.namaPelanggan}*,

Terima kasih telah berbelanja di *${namaToko}*.
Berikut rincian nota belanja Anda:

*No. Nota:* ${nota.nomorNota}
*Tanggal:* ${formatDateTime(nota.createdAt)}
*Total Belanja:* *${formatRupiah(nota.totalHarga)}*
*Status Pengiriman:* ${statusText}

*Rincian Item:*
${itemDetails}
${nota.catatan ? `*Catatan:* ${nota.catatan}\n` : ""}
${nota.fotoBuktiUrl ? `*Bukti Penerimaan:* ${window.location.origin}${nota.fotoBuktiUrl}\n` : ""}
Terima kasih dan sehat selalu! 🙏`

    // Format phone number
    let cleanedPhone = (nota.noHpPelanggan || "").replace(/\D/g, "")
    if (cleanedPhone.startsWith("0")) {
      cleanedPhone = "62" + cleanedPhone.slice(1)
    }
    window.open(`https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(pesan)}`, "_blank")
  }

  if (loading) return <div className="card text-center py-12 text-muted pt-12 lg:pt-0">Memuat...</div>
  if (!nota) return <div className="card text-center py-12 text-muted pt-12 lg:pt-0">Nota tidak ditemukan</div>

  const notaWithToko = { ...nota, toko }

  // Check if current user is allowed to execute delivery actions (assigned courier or admin)
  const canPerformDeliveryActions = userRole === "ADMIN" || (userRole === "KURIR" && userId === nota.kurir?.id)

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="no-print page-header">
        <div className="flex items-center gap-3">
          <Link href="/nota" className="btn-ghost p-2"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="page-title">{nota.nomorNota}</h1>
            <p className="page-subtitle">{formatDateTime(nota.createdAt)}</p>
          </div>
        </div>
        {userRole !== "KURIR" && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => handlePrint("nota")} className="btn-secondary btn-sm"><Printer className="w-4 h-4" /> Cetak Nota</button>
            <button onClick={() => handlePrint("sj")} className="btn-secondary btn-sm"><FileText className="w-4 h-4" /> Surat Jalan</button>
            <button onClick={() => handlePrint("gabungan")} className="btn-secondary btn-sm"><Printer className="w-4 h-4" /> Gabungan</button>
            {userRole === "ADMIN" && (
              <button onClick={handleDelete} className="btn-danger btn-sm"><Trash2 className="w-4 h-4" /> Hapus</button>
            )}
          </div>
        )}
      </div>

      <div className="no-print grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold mb-4">Detail Item</h2>
          <div className="table-container">
            <table className="table-base">
              <thead><tr><th>Barang</th><th>Harga</th><th>Diskon</th><th>Qty</th><th>Subtotal</th></tr></thead>
              <tbody>
                {nota.items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-medium">{item.barang.nama}</p>
                      <p className="text-xs text-muted">Grade {item.barang.grade}</p>
                    </td>
                    <td>{formatRupiah(item.hargaSatuan)}</td>
                    <td>{item.diskon > 0 ? <span className="text-success">-{formatRupiah(item.diskon)}</span> : "-"}</td>
                    <td>{item.jumlah}</td>
                    <td className="font-medium">{formatRupiah(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-right font-semibold border-t border-border px-4 py-3">Total</td>
                  <td className="font-bold text-primary border-t border-border px-4 py-3">{formatRupiah(nota.totalHarga)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card space-y-3">
            <h2 className="font-semibold">Info Pelanggan</h2>
            <p className="text-sm"><span className="text-muted">Nama:</span> {nota.namaPelanggan}</p>
            {nota.noHpPelanggan && <p className="text-sm"><span className="text-muted">HP:</span> {nota.noHpPelanggan}</p>}
            {nota.alamatPelanggan && <p className="text-sm"><span className="text-muted">Alamat:</span> {nota.alamatPelanggan}</p>}
            {nota.catatan && <p className="text-sm"><span className="text-muted">Catatan:</span> {nota.catatan}</p>}
            <p className="text-sm"><span className="text-muted">Kasir:</span> {nota.kasir.nama}</p>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><Truck className="w-5 h-5 text-primary" /> Pengiriman</h2>
            <div>
              <p className="text-xs text-muted mb-1">Status Pengiriman:</p>
              {nota.statusPengiriman === "SUDAH_SAMPAI" ? (
                <span className="badge-success">Sudah Sampai / Diterima</span>
              ) : nota.statusPengiriman === "AKAN_DIKIRIM" ? (
                <span className="badge-info">Akan Dikirim / Di Perjalanan</span>
              ) : (
                <span className="badge-warning">Belum Dikirim</span>
              )}
            </div>

            {/* Courier selector for admin & kasir */}
            {userRole !== "KURIR" && (
              <div>
                <label className="label text-xs mb-1">Petugas Kurir:</label>
                <select
                  disabled={nota.statusPengiriman === "SUDAH_SAMPAI"}
                  className="input-field py-1 text-sm mt-1"
                  value={nota.kurir?.id || ""}
                  onChange={e => assignCourier(e.target.value)}
                >
                  <option value="">-- Belum Ditugaskan --</option>
                  {couriers.map(c => (
                    <option key={c.id} value={c.id}>{c.nama} ({c.noHp || "No HP -"})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Display Courier Name (if assigned) */}
            {nota.kurir && (
              <div className="p-2 rounded-xl bg-input border border-border text-xs">
                <p className="font-medium text-foreground">Kurir: {nota.kurir.nama}</p>
                {nota.kurir.noHp && <p className="text-muted mt-0.5">HP: {nota.kurir.noHp}</p>}
              </div>
            )}

            {/* Display Photo Proof if Available */}
            {nota.fotoBuktiUrl && (
              <div className="p-2.5 rounded-xl bg-input border border-border space-y-1.5">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-primary" /> Bukti Penerimaan:
                </p>
                <a href={nota.fotoBuktiUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={nota.fotoBuktiUrl}
                    alt="Bukti Penerimaan"
                    className="w-full max-h-48 object-cover rounded-lg border border-border hover:opacity-90 transition-opacity"
                  />
                </a>
              </div>
            )}

            {/* Delivery status actions - ONLY shown to assigned Kurir or Admin */}
            {canPerformDeliveryActions && (
              <div className="pt-2 space-y-2 border-t border-border mt-2">
                <p className="text-[11px] font-semibold text-muted">Aksi Kurir:</p>
                {nota.statusPengiriman === "BELUM_DIKIRIM" && (
                  <button
                    onClick={() => updatePengiriman("AKAN_DIKIRIM")}
                    className="btn-info btn-sm w-full flex items-center justify-center gap-1.5"
                  >
                    <Truck className="w-4 h-4" /> Mulai Pengiriman (Sedang Dikirim)
                  </button>
                )}

                {nota.statusPengiriman === "AKAN_DIKIRIM" && (
                  <button
                    onClick={handleOpenUploadModal}
                    className="btn-success btn-sm w-full flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" /> Pesanan Telah Diterima
                  </button>
                )}

                {/* Admin reset controls */}
                {userRole === "ADMIN" && nota.statusPengiriman !== "BELUM_DIKIRIM" && (
                  <button
                    onClick={() => updatePengiriman("BELUM_DIKIRIM")}
                    className="btn-ghost btn-sm w-full text-xs text-muted hover:text-foreground"
                  >
                    Batalkan & Reset Status
                  </button>
                )}
              </div>
            )}
          </div>

          {/* WhatsApp Action Card */}
          {nota.noHpPelanggan && (
            <div className="card space-y-3">
              <h2 className="font-semibold flex items-center gap-2">💬 Notifikasi WhatsApp</h2>
              <p className="text-xs text-muted">Kirim detail nota langsung ke nomor WhatsApp pelanggan *{nota.noHpPelanggan}*.</p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={sendWhatsAppApi}
                  disabled={waLoading}
                  className="btn-primary btn-sm w-full flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> {waLoading ? "Mengirim..." : "Kirim via API / Log"}
                </button>
                <button
                  onClick={openWhatsAppManual}
                  className="btn-secondary btn-sm w-full flex items-center justify-center gap-2"
                >
                  Kirim WA Manual (Web)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Live Camera & Upload Bukti Penerimaan */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-md w-full space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" /> Bukti Foto Penerimaan (Live)
              </h3>
              <button onClick={handleCloseUploadModal} className="btn-ghost p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Camera view / live feed */}
              {isCameraActive && !filePreview && (
                <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="bg-primary hover:bg-primary-dark text-white rounded-full p-3 shadow-lg flex items-center justify-center border border-white"
                    >
                      <Camera className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )}

              {/* Photo preview with watermark */}
              {filePreview && (
                <div className="relative rounded-xl overflow-hidden border border-border bg-black">
                  <img src={filePreview} alt="Foto Bukti Penerimaan" className="w-full h-auto object-contain" />
                  <button
                    type="button"
                    onClick={startCamera}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2"
                    title="Ambil Ulang Foto"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Camera Error or Denied Falls Back to Mobile direct camera input */}
              {cameraError && !filePreview && (
                <div className="p-4 rounded-xl border border-warning/30 bg-warning/5 text-center space-y-3">
                  <p className="text-xs text-warning-foreground">
                    Akses kamera live terblokir atau tidak didukung pada browser Anda.
                  </p>
                  <label className="btn-secondary btn-sm block cursor-pointer text-center">
                    <Upload className="w-4 h-4 inline mr-1" /> Buka Kamera Perangkat
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Hidden canvas for drawing frame & watermark */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <button
                disabled={uploading}
                onClick={handleCloseUploadModal}
                className="btn-ghost btn-sm"
              >
                Batal
              </button>
              <button
                disabled={uploading || !selectedFile}
                onClick={handleConfirmReceived}
                className="btn-success btn-sm flex items-center gap-1.5"
              >
                {uploading ? (
                  "Mengunggah..."
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Konfirmasi & Kirim
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {nota.retur.length > 0 && (
        <div className="no-print card">
          <h2 className="font-semibold mb-3">Riwayat Retur</h2>
          {nota.retur.map(r => (
            <div key={r.id} className="p-3 rounded-xl bg-input border border-border mb-2">
              <p className="text-sm font-medium">Alasan: {r.alasan} · Nilai: {formatRupiah(r.totalNilai)}</p>
              <div className="mt-1 space-y-1">{r.items.map((ri, i) => <p key={i} className="text-xs text-muted">{ri.barang.nama} × {ri.jumlah} ({ri.kondisi})</p>)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Print area - using reusable components */}
      <div ref={printRef} className="hidden print:block print-area p-8">
        {(printMode === "nota" || printMode === "gabungan") && (
          <CetakNota nota={notaWithToko} />
        )}
        {printMode === "gabungan" && <div className="page-break" />}
        {(printMode === "sj" || printMode === "gabungan") && (
          <CetakSuratJalan nota={notaWithToko} />
        )}
      </div>
    </div>
  )
}
