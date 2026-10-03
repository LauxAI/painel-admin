import type { AdminRole } from "@/lib/types"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"

export function Sidebar({ role }: { role: AdminRole }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <span className="font-mono text-sm font-bold text-primary-foreground">L</span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold text-sidebar-foreground">LAUXAI CORE</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
            Painel admin
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav role={role} />
      </div>
    </aside>
  )
}
