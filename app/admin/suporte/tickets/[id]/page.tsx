import { notFound } from "next/navigation"
import { FileQuestion } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { EmptyStateCard } from "@/components/dashboard/empty-state-card"
import { cn } from "@/lib/utils"

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // There is no `support_tickets` table yet, so every ticket id is
  // currently unresolvable. This renders a clear "not implemented" state
  // instead of fabricating ticket data.
  if (!id) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Ticket #{id}</h1>
          <p className="text-sm text-muted-foreground">Detalhes do chamado de suporte.</p>
        </div>
        <Link href="/admin/suporte/tickets" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Voltar
        </Link>
      </div>

      <EmptyStateCard
        icon={FileQuestion}
        title="Ticket indisponível"
        description="A central de tickets ainda não está conectada a uma tabela de dados. Assim que o módulo de suporte for implementado no banco de dados, os detalhes deste chamado aparecerão aqui."
      />
    </div>
  )
}
