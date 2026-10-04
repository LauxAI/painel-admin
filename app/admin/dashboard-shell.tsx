"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Topbar } from "@/components/dashboard/topbar"
import type { AdminProfile } from "@/lib/types"

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/usuarios": "Usuários e Contas",
  "/admin/administradores": "Administradores",
  "/admin/financeiro": "Financeiro",
  "/admin/financeiro/assinaturas": "Assinaturas",
  "/admin/financeiro/pagamentos": "Pagamentos",
  "/admin/financeiro/inadimplencia": "Inadimplência",
  "/admin/financeiro/planos": "Planos",
  "/admin/suporte": "Suporte",
  "/admin/suporte/tickets": "Tickets",
  "/admin/logs": "Logs e Atividades",
  "/admin/configuracoes": "Configurações",
}

function resolveTitle(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  const base = "/" + pathname.split("/").slice(1, 3).join("/")
  return PAGE_TITLES[base] ?? "LAUXAI CORE"
}

export function DashboardShell({ admin, children }: { admin: AdminProfile; children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar role={admin.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar admin={admin} title={resolveTitle(pathname)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
