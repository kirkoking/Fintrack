import { useState } from 'react'
import { useTransactions, useAccounts, useUpdateCategory } from '../hooks/useFintrack'
import { CATEGORY_NAMES, CATEGORY_COLORS, clp, type CategorySlug } from '../lib/supabase'

const ALL_CATS = Object.entries(CATEGORY_NAMES) as [CategorySlug, string][]

interface Props {
  initialFilters?: {
    category?: CategorySlug | ''
    accountId?: string
    month?: string
  }
}

export function TransactionTable({ initialFilters }: Props) {
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategorySlug | ''>(initialFilters?.category ?? '')
  const [accountId, setAccountId] = useState(initialFilters?.accountId ?? '')
  const [month, setMonth] = useState(initialFilters?.month ?? '')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const { data, isLoading } = useTransactions(page, PAGE_SIZE, { category, accountId, month, search })
  const { data: accounts } = useAccounts()
  const updateCat = useUpdateCategory()

  const accMap = new Map((accounts ?? []).map(a => [a.id, `${a.bank} · ${a.name}`]))
  const txs = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function handleCatChange(id: string, cat: CategorySlug) {
    updateCat.mutate({ id, category: cat }, {
      onSuccess: () => setSavedIds(prev => new Set([...prev, id])),
    })
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 p-3 border-b border-border bg-surface2">
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          className="flex-1 min-w-32 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder-text3 outline-none focus:border-accent"
        />
        <select
          value={category}
          onChange={e => { setCategory(e.target.value as CategorySlug | ''); setPage(0) }}
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
        >
          <option value="">Categorías</option>
          {ALL_CATS.map(([slug, name]) => (
            <option key={slug} value={slug}>{name}</option>
          ))}
        </select>
        <select
          value={accountId}
          onChange={e => { setAccountId(e.target.value); setPage(0) }}
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
        >
          <option value="">Cuentas</option>
          {(accounts ?? []).map(a => (
            <option key={a.id} value={a.id}>{a.bank} · {a.name}</option>
          ))}
        </select>
        <input
          type="month"
          value={month}
          onChange={e => { setMonth(e.target.value); setPage(0) }}
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="h-64 animate-pulse bg-surface" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface2">
                <th className="text-left px-4 py-2.5 font-sans text-xs text-text3 font-medium">Fecha</th>
                <th className="text-left px-4 py-2.5 font-sans text-xs text-text3 font-medium">Descripción</th>
                <th className="text-right px-4 py-2.5 font-sans text-xs text-text3 font-medium">Monto</th>
                <th className="text-left px-4 py-2.5 font-sans text-xs text-text3 font-medium">Categoría</th>
                <th className="text-left px-4 py-2.5 font-sans text-xs text-text3 font-medium hidden sm:table-cell">Cuenta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {txs.map(tx => {
                const saved = savedIds.has(tx.id)
                return (
                  <tr key={tx.id} className="hover:bg-surface2 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-text3 whitespace-nowrap">{tx.date}</td>
                    <td className="px-4 py-2.5 font-sans text-xs text-text max-w-[200px] truncate">
                      {tx.description_clean ?? tx.description_raw ?? '—'}
                    </td>
                    <td className={`px-4 py-2.5 font-mono text-sm text-right whitespace-nowrap ${
                      tx.amount < 0 ? 'text-text' : 'text-success'
                    }`}>
                      {clp(tx.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {tx.category_slug && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: CATEGORY_COLORS[tx.category_slug as CategorySlug] ?? '#808090' }}
                          />
                        )}
                        <select
                          value={tx.category_slug ?? ''}
                          onChange={e => handleCatChange(tx.id, e.target.value as CategorySlug)}
                          className={`bg-transparent text-xs outline-none cursor-pointer hover:text-accent transition-colors ${
                            saved ? 'text-success' : 'text-text2'
                          }`}
                        >
                          <option value="">—</option>
                          {ALL_CATS.map(([slug, name]) => (
                            <option key={slug} value={slug}>{name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-sans text-xs text-text3 hidden sm:table-cell truncate max-w-[120px]">
                      {tx.account_id ? (accMap.get(tx.account_id) ?? '—') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-surface2">
        <span className="font-sans text-xs text-text3">
          {total.toLocaleString()} transacciones
        </span>
        <div className="flex gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 rounded-lg text-xs font-sans text-text2 border border-border disabled:opacity-40 hover:bg-surface hover:text-text transition-colors"
          >
            ← Anterior
          </button>
          <span className="px-2 py-1 text-xs font-mono text-text3">
            {page + 1}/{totalPages || 1}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded-lg text-xs font-sans text-text2 border border-border disabled:opacity-40 hover:bg-surface hover:text-text transition-colors"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  )
}
