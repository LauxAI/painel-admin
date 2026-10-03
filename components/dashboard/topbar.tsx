import { ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar"
import { SignOutButton } from "@/components/dashboard/sign-out-button"
import { getInitials } from "@/lib/format"
import { ADMIN_ROLE_LABELS, type AdminProfile } from "@/lib/types"

export function Topbar({ admin, title }: { admin: AdminProfile; title: string }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <MobileSidebar role={admin.role} />
        <h1 className="text-pretty text-base font-semibold text-foreground">{title}</h1>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {getInitials(admin.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium text-foreground sm:inline">{admin.name}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">{admin.name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{admin.email}</span>
            <Badge variant="secondary" className="mt-1 w-fit font-mono text-[10px]">
              {ADMIN_ROLE_LABELS[admin.role]}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <SignOutButton />
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
