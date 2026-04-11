import { motion } from 'framer-motion'
import { clp } from '../lib/supabase'

interface Props {
  kind: string
  severity: number
  title: string
  body: string
  merchant?: string | null
  annual_impact?: number | null
  onDismiss?: () => void
  onDrilldown?: (merchant: string) => void
}

const SEVERITY_STYLES: Record<number, { border: string; bg: string; dot: string }> = {
  1: { border: 'border-border',  bg: 'bg-surface',  dot: 'bg-text3'   },
  2: { border: 'border-accent2', bg: 'bg-surface',  dot: 'bg-accent2' },
  3: { border: 'border-warning', bg: 'bg-surface2', dot: 'bg-warning' },
  4: { border: 'border-danger',  bg: 'bg-surface2', dot: 'bg-danger'  },
}

export function InsightCard({ kind: _kind, severity, title, body, merchant, annual_impact, onDismiss, onDrilldown }: Props) {
  const s = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES[1]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -80, transition: { duration: 0.2 } }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x < -80 && onDismiss) onDismiss()
      }}
      className={`relative rounded-xl border ${s.border} ${s.bg} p-4 shadow-card cursor-grab active:cursor-grabbing select-none`}
    >
      {/* severity dot */}
      <span className={`absolute top-4 right-4 w-2 h-2 rounded-full ${s.dot}`} />

      <p className="font-sans font-medium text-sm text-text leading-snug pr-4">{title}</p>
      <p className="font-sans text-xs text-text2 mt-1 leading-relaxed">{body}</p>

      <div className="flex items-center gap-3 mt-3">
        {annual_impact != null && Math.abs(annual_impact) > 0 && (
          <span className="font-mono text-xs text-text3">
            {clp(annual_impact)}/año
          </span>
        )}
        {merchant && onDrilldown && (
          <button
            onClick={() => onDrilldown(merchant)}
            className="text-xs text-accent hover:underline ml-auto"
          >
            Ver detalle →
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-text3 hover:text-text2 ml-auto"
          >
            Descartar
          </button>
        )}
      </div>
    </motion.div>
  )
}
