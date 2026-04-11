import { useMerchantTrends } from '../hooks/useFintrack'
import { clp } from '../lib/supabase'

interface Props {
  onDrilldown?: (merchant: string) => void
}

export function MerchantTrend({ onDrilldown }: Props) {
  const { data, isLoading } = useMerchantTrends(20)

  if (isLoading) {
    return <div className="h-40 rounded-xl bg-surface animate-pulse" />
  }

  const trends = data ?? []
  if (trends.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-serif text-base text-text">Merchants con cambio notable</h3>
        <p className="font-sans text-xs text-text3 mt-0.5">Último mes completo vs. promedio histórico</p>
      </div>
      <div className="divide-y divide-border">
        {trends.slice(0, 8).map((t) => {
          const isUp = t.delta_pct > 0

          return (
            <button
              key={t.merchant}
              onClick={() => onDrilldown?.(t.merchant)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface2 transition-colors"
            >
              <span className="font-sans text-sm text-text flex-1 min-w-0 truncate">
                {t.merchant}
              </span>
              <span className="font-mono text-xs text-text3 flex-shrink-0">
                {clp(t.historical_avg)}
              </span>
              <span className="text-text3 text-xs">→</span>
              <span className={`font-mono text-sm flex-shrink-0 ${isUp ? 'text-warning' : 'text-success'}`}>
                {clp(t.latest_total)}
              </span>
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                isUp ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
              }`}>
                {isUp ? '+' : ''}{Math.round(t.delta_pct)}%
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
