import { useState } from 'react'
import { InsightFeed } from '../components/InsightFeed'
import { CashflowBadge } from '../components/CashflowBadge'
import { CategoryComparison } from '../components/CategoryComparison'
import { MerchantTrend } from '../components/MerchantTrend'
import { DrilldownModal } from '../components/DrilldownModal'

export function Dashboard() {
  const [drilldownMerchant, setDrilldownMerchant] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {/* Cashflow hero */}
      <CashflowBadge />

      {/* Insight feed */}
      <section>
        <h2 className="font-serif text-xl text-text mb-3">¿Qué debo saber?</h2>
        <InsightFeed onDrilldown={setDrilldownMerchant} />
      </section>

      {/* Category vs baseline */}
      <section>
        <CategoryComparison />
      </section>

      {/* Merchant trends */}
      <section>
        <MerchantTrend onDrilldown={setDrilldownMerchant} />
      </section>

      {/* Drilldown modal */}
      <DrilldownModal
        merchant={drilldownMerchant}
        onClose={() => setDrilldownMerchant(null)}
      />
    </div>
  )
}
