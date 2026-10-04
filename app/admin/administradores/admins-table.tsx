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
  const [changingRole, setChangingRole] = useState<{ admin: AdminProfile; role: AdminRole } | null>(null)
  const [suspending, setSuspending] = useState<AdminProfile | null>(null)
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

  function confirmRoleChange() {
    if (!changingRole) return
    const { admin, role } = changingRole
    startTransition(async () => {
      try {
        await changeAdminRole(admin.id, role, admin.name)
        toast.success(
          role === "OWNER" ? `${admin.name} foi promovido a Owner.` : `${admin.name} foi rebaixado a Administrador.`,
        )
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível alterar a função.")
      } finally {
        setChangingRole(null)
      }
    })
  }

  function confirmSuspend() {
    if (!suspending) return
    const admin = suspending
    startTransition(async () => {
      try {
        await changeAdminStatus(admin.id, "suspenso", admin.name)
        toast.success(`Acesso de ${admin.name} suspenso.`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível suspender o acesso.")
      } finally {
        setSuspending(null)
      }
    })
  }

  function handleReactivate(admin: AdminProfile) {
    startTransition(async () => {
      try {
        await changeAdminStatus(admin.id, "ativo", admin.name)
        toast.success(`Acesso de ${admin.name} reativado.`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível reativar o acesso.")
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
                              <DropdownMenuItem onClick={() => handleResend(invite)}>
                                <RotateCcw className="size-4" />
                                Reenviar convite (gera novo link)
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => handleCancelInvite(invite)}>
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
                              <DropdownMenuItem onSelect={() => setChangingRole({ admin, role: "OWNER" })}>
                                <ShieldCheck className="size-4" />
                                Promover a Owner
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onSelect={() => setChangingRole({ admin, role: "ADMIN" })}>
                                <Shield className="size-4" />
                                Rebaixar a Administrador
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {admin.status === "ativo" ? (
                              <DropdownMenuItem onSelect={() => setSuspending(admin)}>
                                <Ban className="size-4" />
                                Suspender acesso
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onSelect={() => handleReactivate(admin)}>
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

      <AlertDialog open={!!changingRole} onOpenChange={(open) => !open && setChangingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {changingRole?.role === "OWNER" ? "Promover administrador?" : "Rebaixar administrador?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {changingRole?.role === "OWNER"
                ? "Este usuário passará a ter permissões completas de Owner."
                : "Este usuário perderá as permissões administrativas atuais de Owner."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/40 p-3 text-sm">
            <span className="text-foreground">
              Administrador: <span className="font-medium">{changingRole?.admin.name}</span>
            </span>
            <span>
              Cargo atual:{" "}
              <span className="font-medium text-foreground">
                {changingRole ? ADMIN_ROLE_LABELS[changingRole.admin.role] : ""}
              </span>
            </span>
            <span>
              Novo cargo:{" "}
              <span className="font-medium text-foreground">
                {changingRole ? ADMIN_ROLE_LABELS[changingRole.role] : ""}
              </span>
            </span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange} disabled={isPending}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!suspending} onOpenChange={(open) => !open && setSuspending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspender acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              {suspending?.name} perderá imediatamente o acesso ao painel administrativo até que o acesso seja
              reativado por um Owner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/40 p-3 text-sm">
            <span className="text-foreground">
              Administrador: <span className="font-medium">{suspending?.name}</span>
            </span>
            <span>
              Cargo: <span className="font-medium text-foreground">{suspending ? ADMIN_ROLE_LABELS[suspending.role] : ""}</span>
            </span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSuspend} disabled={isPending}>
              Suspender
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              Este usuário perderá permanentemente o acesso administrativo. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/40 p-3 text-sm">
            <span className="text-foreground">
              Nome: <span className="font-medium">{deleting?.name}</span>
            </span>
            <span>
              Email: <span className="font-medium text-foreground">{deleting?.email}</span>
            </span>
            <span>
              Cargo: <span className="font-medium text-foreground">{deleting ? ADMIN_ROLE_LABELS[deleting.role] : ""}</span>
            </span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
