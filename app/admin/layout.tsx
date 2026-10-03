import type { ReactNode } from "react"
import { getCurrentAdmin } from "@/lib/get-current-admin"
import { DashboardShell } from "@/app/admin/dashboard-shell"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin()

  return <DashboardShell admin={admin}>{children}</DashboardShell>
}
