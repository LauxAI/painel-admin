import { FinanceiroNav } from "@/app/admin/financeiro/financeiro-nav"
import { FinanceiroDashboard } from "@/app/admin/financeiro/financeiro-dashboard"

export default function FinanceiroPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Acompanhe assinaturas, pagamentos e inadimplência.</p>
      </div>
      <FinanceiroNav />
      <FinanceiroDashboard />
    </div>
  )
}
