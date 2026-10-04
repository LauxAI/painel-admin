import { SuporteNav } from "@/app/admin/suporte/suporte-nav"
import { SuporteDashboard } from "@/app/admin/suporte/suporte-dashboard"

export default function SuportePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Suporte</h1>
        <p className="text-sm text-muted-foreground">Central de atendimento e tickets dos clientes.</p>
      </div>
      <SuporteNav />
      <SuporteDashboard />
    </div>
  )
}
