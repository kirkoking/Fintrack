import { SubscriptionList } from '../components/SubscriptionList'
import { useSubscriptions } from '../hooks/useFintrack'
import { clp } from '../lib/supabase'

export function Subscriptions() {
  const { data } = useSubscriptions()
  const total = (data ?? []).reduce((s, r) => s + r.avg_monthly, 0)

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="font-serif text-xl text-text">Suscripciones</h2>
        {total > 0 && (
          <span className="font-mono text-sm text-text3">{clp(total * 12)}/año</span>
        )}
      </div>
      <SubscriptionList />
    </div>
  )
}
