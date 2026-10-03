"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, ShieldCheck, ScrollText, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AdminRole } from "@/lib/types"

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, ownerOnly: false },
  { href: "/admin/usuarios", label: "Usuários e Contas", icon: Users, ownerOnly: false },
  { href: "/admin/administradores", label: "Administradores", icon: ShieldCheck, ownerOnly: false },
  { href: "/admin/logs", label: "Logs e Atividades", icon: ScrollText, ownerOnly: false },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, ownerOnly: true },
] as const

export function SidebarNav({ role, onNavigate }: { role: AdminRole; onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.filter((item) => !item.ownerOnly || role === "OWNER").map((item) => {
        const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
