import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { InsightCard } from './InsightCard'
import { useInsightFeed } from '../hooks/useFintrack'

interface Props {
  onDrilldown?: (merchant: string) => void
}

export function InsightFeed({ onDrilldown }: Props) {
  const { data, isLoading, error } = useInsightFeed()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-surface animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger bg-surface p-4 text-sm text-danger">
        Error cargando insights. Intenta de nuevo.
      </div>
    )
  }

  const visible = (data ?? []).filter((_, i) => !dismissed.has(String(i)))

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-text2 text-sm">Todo en orden — sin novedades esta semana.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <AnimatePresence mode="popLayout">
        {(data ?? []).map((insight, i) => {
          if (dismissed.has(String(i))) return null
          return (
            <InsightCard
              key={i}
              {...insight}
              onDismiss={() => setDismissed(prev => new Set([...prev, String(i)]))}
              onDrilldown={onDrilldown}
            />
          )
        })}
      </AnimatePresence>
    </div>
  )
}
