import { FinanceiroNav } from "@/app/admin/financeiro/financeiro-nav"
import { PaymentsTable } from "@/app/admin/financeiro/pagamentos/payments-table"

export default function PagamentosPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Pagamentos</h1>
        <p className="text-sm text-muted-foreground">Histórico de cobranças processadas pelos gateways de pagamento.</p>
      </div>
      <FinanceiroNav />
      <PaymentsTable />
    </div>
  )
}
