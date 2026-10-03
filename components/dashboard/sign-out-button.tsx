"use client"

import { useTransition } from "react"
import { LogOut } from "lucide-react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { signOutAction } from "@/app/admin/actions"

export function SignOutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <DropdownMenuItem
      disabled={isPending}
      onSelect={(event) => {
        event.preventDefault()
        startTransition(() => {
          signOutAction()
        })
      }}
      className="text-destructive focus:text-destructive"
    >
      <LogOut className="size-4" />
      Sair
    </DropdownMenuItem>
  )
}
