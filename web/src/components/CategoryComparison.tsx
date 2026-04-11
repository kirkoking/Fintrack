import { useMonthlySummary, useBaseline } from '../hooks/useFintrack'
import { CATEGORY_NAMES, CATEGORY_COLORS, ESSENTIAL_CATEGORIES, clp, type CategorySlug } from '../lib/supabase'

export function CategoryComparison() {
  const { data: summary, isLoading: loadingS } = useMonthlySummary()
  const { data: baseline, isLoading: loadingB } = useBaseline()

  if (loadingS || loadingB) {
    return <div className="h-64 rounded-xl bg-surface animate-pulse" />
  }

  // Current month's CLP expenses
  const currentMonth = getYearMonth(new Date())
  const currentExpenses = (summary ?? [])
    .filter(r => r.month?.startsWith(currentMonth) && r.currency === 'CLP' && r.total_amount < 0)

  // Build baseline map
  const baseMap = new Map((baseline ?? []).map(b => [b.category_slug, b.baseline_avg]))

  // Sort by absolute spend this month
  const rows = currentExpenses
    .map(r => ({
      slug: r.category_slug as CategorySlug,
      current: Math.abs(r.total_amount),
      base: Math.abs(baseMap.get(r.category_slug) ?? 0),
    }))
    .filter(r => r.current > 0 || r.base > 0)
    .sort((a, b) => b.current - a.current)

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-text2">
        Sin datos del mes actual.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-serif text-base text-text">Este mes vs. lo normal</h3>
        <p className="font-sans text-xs text-text3 mt-0.5">Solo mes actual · excluyendo períodos excepcionales</p>
      </div>
      <div className="divide-y divide-border">
        {rows.map(({ slug, current, base }) => {
          const isEssential = ESSENTIAL_CATEGORIES.includes(slug)
          const delta = base > 0 ? ((current - base) / base) * 100 : null
          const isHigh = delta !== null && delta > 30
          const color = CATEGORY_COLORS[slug] ?? '#808090'

          return (
            <div key={slug} className="flex items-center gap-3 px-4 py-2.5">
              {/* color dot */}
              <span
                className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />

              {/* category name */}
              <span className="font-sans text-sm text-text flex-1 min-w-0 truncate">
                {CATEGORY_NAMES[slug] ?? slug}
                {isEssential && (
                  <span className="ml-1.5 text-[10px] text-accent2 font-mono">esencial</span>
                )}
              </span>

              {/* baseline */}
              {base > 0 && (
                <span className="font-mono text-xs text-text3 flex-shrink-0">
                  {clp(base)}
                </span>
              )}

              {/* arrow */}
              {base > 0 && <span className="text-text3 text-xs">→</span>}

              {/* current */}
              <span className={`font-mono text-sm flex-shrink-0 ${
                isHigh && !isEssential ? 'text-warning' : 'text-text'
              }`}>
                {clp(current)}
              </span>

              {/* delta badge */}
              {delta !== null && Math.abs(delta) > 5 && (
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                  isHigh && !isEssential
                    ? 'bg-warning/10 text-warning'
                    : delta < -5
                    ? 'bg-success/10 text-success'
                    : 'bg-surface2 text-text3'
                }`}>
                  {delta > 0 ? '+' : ''}{Math.round(delta)}%
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getYearMonth(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
