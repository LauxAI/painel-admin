import { FinanceiroNav } from "@/app/admin/financeiro/financeiro-nav"
import { SubscriptionsTable } from "@/app/admin/financeiro/assinaturas/subscriptions-table"

export default function AssinaturasPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Assinaturas</h1>
        <p className="text-sm text-muted-foreground">Gerencie as assinaturas recorrentes dos clientes.</p>
      </div>
      <FinanceiroNav />
      <SubscriptionsTable />
    </div>
  )
}
