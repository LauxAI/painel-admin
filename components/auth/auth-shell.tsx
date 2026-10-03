import type { ReactNode } from "react"

export function AuthShell({
  children,
  eyebrow,
  title,
  description,
}: {
  children: ReactNode
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 15%, color-mix(in oklch, var(--primary) 16%, transparent), transparent 45%), radial-gradient(circle at 85% 85%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 50%)",
        }}
      />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-1 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary">
            <span className="font-mono text-sm font-bold text-primary-foreground">L</span>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow ?? "LAUXAI CORE"}
          </p>
          <h1 className="text-balance text-xl font-semibold text-foreground">{title}</h1>
          {description ? (
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="rounded-lg border border-border bg-card p-6 shadow-lg shadow-black/40">{children}</div>
      </div>
    </div>
  )
}
