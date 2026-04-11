import { motion, AnimatePresence } from 'framer-motion'
import { useMerchantTransactions } from '../hooks/useFintrack'
import { clp } from '../lib/supabase'

interface Props {
  merchant: string | null
  onClose: () => void
}

export function DrilldownModal({ merchant, onClose }: Props) {
  const { data, isLoading } = useMerchantTransactions(merchant)

  return (
    <AnimatePresence>
      {merchant && (
        <>
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />

          {/* panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 inset-x-0 z-50 bg-surface rounded-t-2xl max-h-[80vh] flex flex-col"
          >
            {/* drag handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 rounded-full bg-border2" />
            </div>

            {/* header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
              <div>
                <h2 className="font-serif text-lg text-text">{merchant}</h2>
                {data && (
                  <p className="font-mono text-xs text-text3 mt-0.5">
                    {data.length} transacciones ·{' '}
                    {clp(data.reduce((s, t) => s + Math.abs(t.amount), 0))} total
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-text3 hover:text-text text-xl leading-none px-2"
              >
                ✕
              </button>
            </div>

            {/* transaction list */}
            <div className="overflow-y-auto flex-1 divide-y divide-border">
              {isLoading && (
                <div className="p-5 space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 rounded bg-surface2 animate-pulse" />
                  ))}
                </div>
              )}
              {!isLoading && data?.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="font-mono text-xs text-text3 w-24 flex-shrink-0">{tx.date}</span>
                  <span className="font-sans text-xs text-text2 flex-1 min-w-0 truncate">
                    {tx.description_clean ?? tx.description_raw}
                  </span>
                  <span className={`font-mono text-sm flex-shrink-0 ${
                    tx.amount < 0 ? 'text-text' : 'text-success'
                  }`}>
                    {clp(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
