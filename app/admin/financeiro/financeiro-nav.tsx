"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/admin/financeiro", label: "Visão geral" },
  { href: "/admin/financeiro/assinaturas", label: "Assinaturas" },
  { href: "/admin/financeiro/pagamentos", label: "Pagamentos" },
  { href: "/admin/financeiro/inadimplencia", label: "Inadimplência" },
  { href: "/admin/financeiro/planos", label: "Planos" },
] as const

export function FinanceiroNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border" aria-label="Navegação do módulo financeiro">
      {TABS.map((tab) => {
        const isActive = tab.href === "/admin/financeiro" ? pathname === tab.href : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
