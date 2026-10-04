"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ACTIVITY_ACTION_LABELS, activityActionLabel } from "@/lib/activity-labels"

const ACTION_OPTIONS = Object.keys(ACTIVITY_ACTION_LABELS).sort((a, b) =>
  activityActionLabel(a).localeCompare(activityActionLabel(b), "pt-BR"),
)

export function LogsFilters({
  admins,
  clients,
}: {
  admins: { id: string; name: string }[]
  clients: { id: string; label: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [search, setSearch] = useState(searchParams.get("q") ?? "")

  const admin = searchParams.get("admin") ?? "todos"
  const conta = searchParams.get("conta") ?? "todos"
  const acao = searchParams.get("acao") ?? "todos"
  const de = searchParams.get("de") ?? ""
  const ate = searchParams.get("ate") ?? ""
  const ordem = searchParams.get("ordem") ?? "recentes"

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "todos") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    params.delete("pagina")
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  useEffect(() => {
    const current = searchParams.get("q") ?? ""
    if (search === current) return
    const timeout = setTimeout(() => updateParams({ q: search }), 400)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const hasActiveFilters = Boolean(
    searchParams.get("q") ||
      searchParams.get("admin") ||
      searchParams.get("conta") ||
      searchParams.get("acao") ||
      searchParams.get("de") ||
      searchParams.get("ate"),
  )

  function clearFilters() {
    setSearch("")
    startTransition(() => {
      router.push(pathname)
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <Label htmlFor="logs-search">Buscar</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="logs-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Responsável ou descrição..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex min-w-[160px] flex-col gap-1.5">
          <Label>Administrador</Label>
          <Select value={admin} onValueChange={(value) => updateParams({ admin: value ?? "todos" })}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os administradores</SelectItem>
              {admins.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[160px] flex-col gap-1.5">
          <Label>Empresa/conta</Label>
          <Select value={conta} onValueChange={(value) => updateParams({ conta: value ?? "todos" })}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as contas</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[180px] flex-col gap-1.5">
          <Label>Tipo de ação</Label>
          <Select value={acao} onValueChange={(value) => updateParams({ acao: value ?? "todos" })}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as ações</SelectItem>
              {ACTION_OPTIONS.map((action) => (
                <SelectItem key={action} value={action}>
                  {activityActionLabel(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="logs-de">De</Label>
          <Input id="logs-de" type="date" value={de} onChange={(e) => updateParams({ de: e.target.value })} className="w-full sm:w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="logs-ate">Até</Label>
          <Input id="logs-ate" type="date" value={ate} onChange={(e) => updateParams({ ate: e.target.value })} className="w-full sm:w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Ordenar por</Label>
          <Select value={ordem} onValueChange={(value) => updateParams({ ordem: value ?? "recentes" })}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recentes">Mais recentes</SelectItem>
              <SelectItem value="antigos">Mais antigos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasActiveFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
            <X className="size-3.5" />
            Limpar filtros
          </Button>
        ) : null}
      </div>
    </div>
  )
}
