import { useCashflow } from '../hooks/useFintrack'
import { clp, clpK } from '../lib/supabase'

export function CashflowBadge() {
  const { data, isLoading } = useCashflow()

  if (isLoading) {
    return <div className="h-16 rounded-2xl bg-surface animate-pulse" />
  }

  const currentMonth = data?.[0]
  if (!currentMonth) return null

  const net = currentMonth.net_flow
  const isPositive = net >= 0

  // Days left in the current month
  const today = new Date()
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysLeft = lastDay - today.getDate() + 1
  const dailyBurn = daysLeft > 0 ? net / daysLeft : 0

  return (
    <div className={`rounded-2xl border px-5 py-4 flex items-center justify-between gap-4
      ${isPositive ? 'border-success bg-surface' : 'border-danger bg-surface2'}`}>
      <div>
        <p className="font-sans text-xs text-text3 uppercase tracking-wide mb-0.5">
          Este mes · flujo neto
        </p>
        <p className={`font-serif text-2xl ${isPositive ? 'text-success' : 'text-danger'}`}>
          {isPositive ? '+' : ''}{clp(net)}
        </p>
      </div>

      <div className="text-right">
        {isPositive ? (
          <>
            <p className="font-mono text-lg text-accent">{clpK(dailyBurn)}/día</p>
            <p className="font-sans text-xs text-text3">por {daysLeft} días restantes</p>
          </>
        ) : (
          <>
            <p className="font-mono text-lg text-danger">{clp(currentMonth.total_expenses)} gastado</p>
            <p className="font-sans text-xs text-text3">vs {clp(currentMonth.total_income)} ingresado</p>
          </>
        )}
      </div>
    </div>
  )
}
