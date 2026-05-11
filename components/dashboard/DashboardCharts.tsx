"use client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface Props {
  data: { tanggal: string; total: number }[]
}

export default function DashboardCharts({ data }: Props) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="tanggal" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={{ stroke: "#27272a" }} />
          <YAxis tick={{ fill: "#71717a", fontSize: 12 }} axisLine={{ stroke: "#27272a" }}
            tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : v}
          />
          <Tooltip
            contentStyle={{ background: "#16161d", border: "1px solid #27272a", borderRadius: "12px", color: "#e4e4e7" }}
            formatter={(value: any) => [new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value as number), "Penjualan"]}
          />
          <Bar dataKey="total" fill="url(#gradient)" radius={[6, 6, 0, 0]} />
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
