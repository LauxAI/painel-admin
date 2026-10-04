import { SuporteNav } from "@/app/admin/suporte/suporte-nav"
import { TicketsTable } from "@/app/admin/suporte/tickets/tickets-table"

export default function TicketsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Tickets</h1>
        <p className="text-sm text-muted-foreground">Todos os chamados de suporte abertos pelos clientes.</p>
      </div>
      <SuporteNav />
      <TicketsTable />
    </div>
  )
}
