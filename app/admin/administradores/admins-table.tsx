"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { MoreHorizontal, RotateCcw, Ban, CheckCircle2, Trash2, ShieldCheck, Shield, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  changeAdminRole,
  changeAdminStatus,
  cancelAdminInvite,
  removeAdmin,
  resendAdminInvite,
} from "@/app/admin/administradores/actions"
import { ADMIN_STATUS_BADGE, INVITE_STATUS_BADGE } from "@/lib/status-styles"
import { ADMIN_ROLE_LABELS } from "@/lib/types"
import { formatDateTime } from "@/lib/format"
import type { AdminProfile, AdminRole, AdminStatus, Invite } from "@/lib/types"

type Row =
  | { kind: "admin"; data: AdminProfile }
  | { kind: "invite"; data: Invite }

export function AdminsTable({
  admins,
  pendingInvites,
  currentAdminId,
  isOwner,
}: {
  admins: AdminProfile[]
  pendingInvites: Invite[]
  currentAdminId: string
  isOwner: boolean
}) {
  const [deleting, setDeleting] = useState<AdminProfile | null>(null)
  const [isPending, startTransition] = useTransition()

  const rows: Row[] = useMemo(
    () => [
      ...admins.map((data): Row => ({ kind: "admin", data })),
      ...pendingInvites.map((data): Row => ({ kind: "invite", data })),
    ],
    [admins, pendingInvites],
  )

  function copyInviteLink(path: string) {
    navigator.clipboard.writeText(`${window.location.origin}${path}`)
    toast.success("Link do convite copiado.")
  }

  function handleResend(invite: Invite) {
    startTransition(async () => {
      try {
        const path = await resendAdminInvite(invite.id, invite.email, invite.name, invite.role ?? "ADMIN")
        copyInviteLink(path)
      } catch {
        toast.error("Não foi possível reenviar o convite.")
      }
    })
  }

  function handleCancelInvite(invite: Invite) {
    startTransition(async () => {
      try {
        await cancelAdminInvite(invite.id, invite.name)
        toast.success("Convite cancelado.")
      } catch {
        toast.error("Não foi possível cancelar o convite.")
      }
    })
  }

  function handleRoleChange(admin: AdminProfile, role: AdminRole) {
    startTransition(async () => {
      try {
        await changeAdminRole(admin.id, role, admin.name)
        toast.success(`Função atualizada para "${ADMIN_ROLE_LABELS[role]}".`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível alterar a função.")
      }
    })
  }

  function handleStatusChange(admin: AdminProfile, status: AdminStatus) {
    startTransition(async () => {
      try {
        await changeAdminStatus(admin.id, status, admin.name)
        toast.success(status === "ativo" ? "Administrador reativado." : "Administrador suspenso.")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível alterar o status.")
      }
    })
  }

  function handleDelete() {
    if (!deleting) return
    const admin = deleting
    startTransition(async () => {
      try {
        await removeAdmin(admin.id, admin.name)
        toast.success("Administrador removido.")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível remover o administrador.")
      } finally {
        setDeleting(null)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  Nenhum administrador encontrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                if (row.kind === "invite") {
                  const invite = row.data
                  return (
                    <TableRow key={`invite-${invite.id}`}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{invite.name}</span>
                          <span className="text-xs text-muted-foreground">{invite.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ADMIN_ROLE_LABELS[invite.role ?? "ADMIN"]}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={INVITE_STATUS_BADGE.pendente}>
                          Convite pendente
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>
                      <TableCell>
                        {isOwner ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" size="icon" className="size-8" disabled={isPending}>
                                  <MoreHorizontal className="size-4" />
                                  <span className="sr-only">Ações</span>
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleResend(invite)}>
                                <RotateCcw className="size-4" />
                                Reenviar convite (gera novo link)
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onSelect={() => handleCancelInvite(invite)}>
                                <XCircle className="size-4" />
                                Cancelar convite
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                }

                const admin = row.data
                const isSelf = admin.id === currentAdminId
                return (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {admin.name}
                          {isSelf ? <span className="ml-2 text-xs text-muted-foreground">(você)</span> : null}
                        </span>
                        <span className="text-xs text-muted-foreground">{admin.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ADMIN_ROLE_LABELS[admin.role]}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ADMIN_STATUS_BADGE[admin.status]}>
                        {admin.status === "ativo" ? "Ativo" : "Suspenso"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(admin.last_sign_in_at)}
                    </TableCell>
                    <TableCell>
                      {isOwner && !isSelf ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon" className="size-8" disabled={isPending}>
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Ações</span>
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            {admin.role === "ADMIN" ? (
                              <DropdownMenuItem onSelect={() => handleRoleChange(admin, "OWNER")}>
                                <ShieldCheck className="size-4" />
                                Promover a Owner
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onSelect={() => handleRoleChange(admin, "ADMIN")}>
                                <Shield className="size-4" />
                                Rebaixar a Administrador
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {admin.status === "ativo" ? (
                              <DropdownMenuItem onSelect={() => handleStatusChange(admin, "suspenso")}>
                                <Ban className="size-4" />
                                Suspender acesso
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onSelect={() => handleStatusChange(admin, "ativo")}>
                                <CheckCircle2 className="size-4" />
                                Reativar acesso
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(admin)}>
                              <Trash2 className="size-4" />
                              Remover administrador
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente o acesso de {deleting?.name}. Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
