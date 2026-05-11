"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Package, Tags, Truck, FileText, RotateCcw,
  Users, BarChart3, UserCircle, Store, LogOut, Menu, X, ChevronRight
} from "lucide-react"

const adminMenus = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/barang", label: "Barang", icon: Package },
  { href: "/kategori", label: "Kategori", icon: Tags },
  { href: "/supplier", label: "Supplier", icon: Truck },
  { href: "/nota", label: "Nota", icon: FileText },
  { href: "/retur", label: "Retur", icon: RotateCcw },
  { href: "/kasir", label: "Kasir", icon: Users },
  { href: "/analisis", label: "Analisis", icon: BarChart3 },
  { href: "/profil", label: "Profil", icon: UserCircle },
]

const kasirMenus = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/nota", label: "Nota", icon: FileText },
  { href: "/retur", label: "Retur", icon: RotateCcw },
  { href: "/profil", label: "Profil", icon: UserCircle },
]

interface SidebarProps {
  userName: string
  userRole: string
}

export default function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menus = userRole === "ADMIN" ? adminMenus : kasirMenus

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
          <Store className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-foreground tracking-tight">POS</h1>
            <p className="text-[10px] text-muted truncate">Manajemen Toko</p>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menus.map((menu) => {
          const Icon = menu.icon
          const active = isActive(menu.href)
          return (
            <Link
              key={menu.href}
              href={menu.href}
              onClick={() => setMobileOpen(false)}
              className={active ? "sidebar-link-active" : "sidebar-link"}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{menu.label}</span>}
              {!collapsed && active && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-border">
        {!collapsed && (
          <div className="px-4 py-2 mb-2">
            <p className="text-sm font-medium text-foreground truncate">{userName}</p>
            <p className="text-xs text-muted">{userRole}</p>
          </div>
        )}
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="sidebar-link w-full text-danger hover:text-danger hover:bg-danger/10">
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Keluar</span>}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 btn-secondary p-2 rounded-xl"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)}>
          <aside className="w-64 h-full bg-sidebar border-r border-border" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:block h-screen bg-sidebar border-r border-border sticky top-0 transition-all duration-300 ${
          collapsed ? "w-[70px]" : "w-64"
        }`}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center text-muted hover:text-foreground z-10"
        >
          <ChevronRight className={`w-3 h-3 transition-transform ${collapsed ? "" : "rotate-180"}`} />
        </button>
        {sidebarContent}
      </aside>
    </>
  )
}
