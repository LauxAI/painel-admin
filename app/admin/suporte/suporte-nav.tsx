"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/admin/suporte", label: "Visão geral" },
  { href: "/admin/suporte/tickets", label: "Tickets" },
] as const

export function SuporteNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border" aria-label="Navegação do módulo de suporte">
      {TABS.map((tab) => {
        const isActive = tab.href === "/admin/suporte" ? pathname === tab.href : pathname.startsWith(tab.href)
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
