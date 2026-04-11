import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://japiqczoxgxnygwakmcm.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphcGlxY3pveGd4bnlnd2FrbWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4Mzc5MDYsImV4cCI6MjA5MDQxMzkwNn0.qqtlYy-4mzjNghaCDJXAK0QU9mW5DBmtfHN8wQfjn2U'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Types ──────────────────────────────────────────────────────────────────

export type CategorySlug =
  | 'food' | 'transport' | 'shopping' | 'health' | 'entertainment'
  | 'fitness' | 'personal_care' | 'utilities' | 'housing' | 'fees'
  | 'loan_payment' | 'payment' | 'other' | 'travel' | 'donations'
  | 'subscriptions' | 'pets' | 'education'

export type TransactionType = 'expense' | 'transfer_out' | 'transfer_in' | 'income'

export interface Transaction {
  id: string
  account_id: string | null
  import_id: string | null
  date: string
  description_raw: string | null
  description_clean: string | null
  amount: number
  currency: string
  category_slug: CategorySlug | null
  transaction_type: TransactionType
  is_recurring: boolean
  notes: string | null
  receipt_url: string | null
  hash: string | null
  card_last_four: string | null
  created_at: string
}

export interface Account {
  id: string
  name: string
  bank: string
  type: string
  currency: string
  last_four: string | null
  is_active: boolean
}

export interface InsightCard {
  kind: string
  severity: number          // 1=info, 2=low, 3=medium, 4=urgent
  title: string
  body: string
  merchant: string | null
  category_slug: CategorySlug | null
  delta_clp: number | null
  annual_impact: number | null
  evidence: Record<string, unknown> | null
}

export interface MonthlySummary {
  month: string
  category_slug: CategorySlug
  currency: string
  total_amount: number
  tx_count: number
  is_exceptional: boolean
}

export interface BaselineMonthly {
  category_slug: CategorySlug
  baseline_avg: number
  months_sampled: number
}

export interface SubscriptionCandidate {
  merchant: string
  avg_monthly: number
  annual_impact: number
  classification: string
  is_essential: boolean
  currency: string
}

export interface MerchantTrend {
  merchant: string
  latest_total: number
  historical_avg: number
  delta_pct: number
  delta_clp: number
  currency: string
}

export interface Cashflow {
  month: string
  total_income: number
  total_expenses: number
  net_flow: number
}

// ── Category display helpers ───────────────────────────────────────────────

export const CATEGORY_NAMES: Record<CategorySlug, string> = {
  food: 'Comida',
  transport: 'Transporte',
  shopping: 'Compras',
  health: 'Salud',
  entertainment: 'Entretención',
  fitness: 'Fitness',
  personal_care: 'Cuidado personal',
  utilities: 'Servicios',
  housing: 'Vivienda',
  fees: 'Comisiones',
  loan_payment: 'Cuota préstamo',
  payment: 'Pago tarjeta',
  other: 'Otro',
  travel: 'Viajes',
  donations: 'Donaciones',
  subscriptions: 'Suscripciones',
  pets: 'Mascotas',
  education: 'Educación',
}

export const CATEGORY_COLORS: Record<CategorySlug, string> = {
  food: '#f0a060',
  transport: '#60a0f0',
  shopping: '#f060a8',
  health: '#60f0a8',
  entertainment: '#c8f060',
  fitness: '#60f0f0',
  personal_care: '#f060f0',
  utilities: '#a060f0',
  housing: '#f0e060',
  fees: '#f06060',
  loan_payment: '#f08060',
  payment: '#a0a0f0',
  other: '#808090',
  travel: '#60c8f0',
  donations: '#f0c060',
  subscriptions: '#80f060',
  pets: '#f0a0a0',
  education: '#a0f0a0',
}

// ── Format helpers ─────────────────────────────────────────────────────────

export function clp(n: number): string {
  const abs = Math.abs(Math.round(n))
  return '$' + abs.toLocaleString('es-CL')
}

export function clpSigned(n: number): string {
  const sign = n >= 0 ? '+' : '-'
  return sign + clp(n)
}

export function clpK(n: number): string {
  const abs = Math.abs(Math.round(n))
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `$${(abs / 1_000).toFixed(0)}K`
  return clp(n)
}

export const ESSENTIAL_CATEGORIES: CategorySlug[] = [
  'health', 'housing', 'utilities', 'education',
]
