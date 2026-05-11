"use client"

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  rowKey: (row: T) => string
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = "Tidak ada data",
  rowKey,
}: DataTableProps<T>) {
  if (loading) {
    return <div className="card text-center py-12 text-muted">Memuat...</div>
  }

  if (data.length === 0) {
    return <div className="card text-center py-12 text-muted">{emptyMessage}</div>
  }

  return (
    <div className="table-container">
      <table className="table-base">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td key={col.key} className={col.className}>
                  {col.render
                    ? col.render(row)
                    : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
