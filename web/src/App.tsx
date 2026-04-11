import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Dashboard } from './views/Dashboard'
import { Transactions } from './views/Transactions'
import { Subscriptions } from './views/Subscriptions'
import { Loans } from './views/Loans'

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

type Tab = 'dashboard' | 'transacciones' | 'suscripciones' | 'creditos'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'dashboard',      label: 'Inicio',        emoji: '🧠' },
  { id: 'transacciones',  label: 'Movimientos',   emoji: '📋' },
  { id: 'suscripciones',  label: 'Suscripciones', emoji: '🔄' },
  { id: 'creditos',       label: 'Créditos',      emoji: '💳' },
]

function AppInner() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('fintrack-theme')
    if (stored === 'light') setDarkMode(false)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode)
    localStorage.setItem('fintrack-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      {/* Top header */}
      <header className="sticky top-0 z-30 bg-surface border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-serif text-xl text-text">Fintrack</h1>
          <button
            onClick={() => setDarkMode(d => !d)}
            className="text-text3 hover:text-text transition-colors text-lg"
            aria-label="Toggle theme"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-24">
        {tab === 'dashboard'     && <Dashboard />}
        {tab === 'transacciones' && <Transactions />}
        {tab === 'suscripciones' && <Subscriptions />}
        {tab === 'creditos'      && <Loans />}
      </main>

      {/* Bottom nav — mobile-first */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border">
        <div className="max-w-2xl mx-auto flex">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-sans transition-colors ${
                tab === t.id ? 'text-accent' : 'text-text3 hover:text-text2'
              }`}
            >
              <span className="text-lg leading-none">{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AppInner />
    </QueryClientProvider>
  )
}
