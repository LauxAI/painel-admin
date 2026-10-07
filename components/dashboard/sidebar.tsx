import Image from "next/image"
import type { AdminRole } from "@/lib/types"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"

export function Sidebar({ role }: { role: AdminRole }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <div className="flex flex-col gap-1 leading-none">
          <Image
            src="/images/logo-lauxai-core.png"
            alt="LAUXAI CORE"
            width={360}
            height={98}
            priority
            className="h-8 w-auto"
          />
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
