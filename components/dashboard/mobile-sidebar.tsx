"use client"

import { useState } from "react"
import Image from "next/image"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import type { AdminRole } from "@/lib/types"

export function MobileSidebar({ role }: { role: AdminRole }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu de navegação"
      >
        <Menu className="size-5" />
      </Button>
      <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
        <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="flex flex-col gap-1 leading-none">
            <Image
              src="/images/logo-lauxai-core.png"
              alt="LAUXAI CORE"
              width={360}
              height={98}
              className="h-8 w-auto"
            />
            <span className="font-mono text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
              Painel admin
            </span>
          </div>
        </div>
        <div className="py-4">
          <SidebarNav role={role} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
