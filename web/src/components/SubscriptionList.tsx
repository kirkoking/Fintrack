import { useSubscriptions } from '../hooks/useFintrack'
import { clp } from '../lib/supabase'

export function SubscriptionList() {
  const { data, isLoading } = useSubscriptions()

  if (isLoading) {
    return <div className="h-48 rounded-xl bg-surface animate-pulse" />
  }

  const subs = data ?? []
  if (subs.length === 0) return null

  const essential = subs.filter(s => s.is_essential)
  const optional  = subs.filter(s => !s.is_essential)

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-serif text-base text-text">Suscripciones activas</h3>
        <span className="font-mono text-xs text-text3">
          {clp(subs.reduce((s, r) => s + r.avg_monthly, 0))}/mes
        </span>
      </div>

      {essential.length > 0 && (
        <Section title="Esenciales" items={essential} accent="text-accent2" />
      )}
      {optional.length > 0 && (
        <Section title="Opcionales" items={optional} accent="text-text2" />
      )}
    </div>
  )
}

function Section({ title, items, accent }: {
  title: string
  items: { merchant: string; avg_monthly: number; annual_impact: number; classification: string }[]
  accent: string
}) {
  return (
    <div>
      <p className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest ${accent} bg-surface2 border-b border-border`}>
        {title}
      </p>
      <div className="divide-y divide-border">
        {items.map(sub => (
          <div key={sub.merchant} className="flex items-center px-4 py-2.5 gap-3">
            <span className="font-sans text-sm text-text flex-1 truncate">{sub.merchant}</span>
            <span className="font-mono text-sm text-text2 flex-shrink-0">{clp(sub.avg_monthly)}/mes</span>
            <span className="font-mono text-xs text-text3 flex-shrink-0">{clp(sub.annual_impact)}/año</span>
          </div>
        ))}
      </div>
    </div>
  )
}
