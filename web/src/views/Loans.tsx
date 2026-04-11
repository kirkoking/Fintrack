import { useLoans } from '../hooks/useFintrack'
import { clp } from '../lib/supabase'

export function Loans() {
  const { data, isLoading } = useLoans()

  if (isLoading) {
    return <div className="h-48 rounded-xl bg-surface animate-pulse" />
  }

  const loans = data ?? []
  const totalMonthly = loans.reduce((s, l) => s + (l.monthly_payment ?? 0), 0)

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="font-serif text-xl text-text">Créditos</h2>
        {totalMonthly > 0 && (
          <span className="font-mono text-sm text-text3">{clp(totalMonthly)}/mes</span>
        )}
      </div>

      <div className="space-y-4">
        {loans.map(loan => {
          const paid = loan.paid_cuotas ?? 0
          const total = loan.total_cuotas ?? 1
          const progress = Math.min(100, Math.round((paid / total) * 100))
          const remaining = total - paid

          const endDate = loan.end_date ? new Date(loan.end_date) : null
          const monthsLeft = endDate
            ? Math.max(0, (endDate.getFullYear() - new Date().getFullYear()) * 12 +
                (endDate.getMonth() - new Date().getMonth()))
            : remaining

          return (
            <div key={loan.id} className="rounded-xl border border-border bg-surface p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-sans text-sm font-medium text-text">{loan.name}</p>
                  <p className="font-sans text-xs text-text3">{loan.bank}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-base text-text">{clp(loan.monthly_payment ?? 0)}/mes</p>
                  <p className="font-sans text-xs text-text3">{monthsLeft} cuotas restantes</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs font-mono text-text3 mb-1">
                  <span>{paid} pagadas</span>
                  <span>{total} total</span>
                </div>
                <div className="h-2 rounded-full bg-surface3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-right text-xs font-mono text-accent mt-1">{progress}%</div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
                {loan.current_balance != null && (
                  <div>
                    <p className="font-sans text-[10px] text-text3 uppercase tracking-wide">Saldo actual</p>
                    <p className="font-mono text-sm text-text">{clp(loan.current_balance)}</p>
                  </div>
                )}
                {loan.interest_rate != null && (
                  <div>
                    <p className="font-sans text-[10px] text-text3 uppercase tracking-wide">Tasa anual</p>
                    <p className="font-mono text-sm text-text">{loan.interest_rate}%</p>
                  </div>
                )}
                {endDate && (
                  <div>
                    <p className="font-sans text-[10px] text-text3 uppercase tracking-wide">Término</p>
                    <p className="font-mono text-sm text-text">
                      {endDate.toLocaleDateString('es-CL', { year: 'numeric', month: 'short' })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {loans.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <p className="text-text2 text-sm">Sin créditos registrados.</p>
          </div>
        )}
      </div>
    </div>
  )
}
