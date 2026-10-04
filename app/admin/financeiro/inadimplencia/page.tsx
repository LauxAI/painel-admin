import { AlertTriangle } from "lucide-react"
import { FinanceiroNav } from "@/app/admin/financeiro/financeiro-nav"
import { EmptyStateCard } from "@/components/dashboard/empty-state-card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function InadimplenciaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Inadimplência</h1>
        <p className="text-sm text-muted-foreground">
          Clientes com pagamentos em atraso ou assinaturas vencidas sem renovação.
        </p>
      </div>
      <FinanceiroNav />

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Valor em atraso</TableHead>
              <TableHead>Dias em atraso</TableHead>
              <TableHead>Último contato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="h-0 p-0" />
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <EmptyStateCard
        icon={AlertTriangle}
        title="Nenhum dado de inadimplência disponível"
        description="Esta visão depende das tabelas de assinaturas e pagamentos, que ainda não existem no banco de dados. Assim que a cobrança recorrente for integrada, os clientes em atraso aparecerão aqui automaticamente."
      />
    </div>
  )
}
