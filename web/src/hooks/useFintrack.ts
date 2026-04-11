import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type CategorySlug } from '../lib/supabase'

// ── Insight feed (hero) ────────────────────────────────────────────────────
export function useInsightFeed() {
  return useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_insights_feed')
        .select('*')
        .order('severity', { ascending: false })
        .order('annual_impact', { ascending: false })
        .limit(15)
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 5,
  })
}

// ── Monthly summary ────────────────────────────────────────────────────────
export function useMonthlySummary() {
  return useQuery({
    queryKey: ['monthly_summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_monthly_summary')
        .select('*')
        .eq('is_exceptional', false)
        .order('month', { ascending: false })
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 10,
  })
}

// ── Baseline monthly ───────────────────────────────────────────────────────
export function useBaseline() {
  return useQuery({
    queryKey: ['baseline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_baseline_monthly')
        .select('*')
        .order('baseline_avg', { ascending: false })
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 15,
  })
}

// ── Subscriptions ──────────────────────────────────────────────────────────
export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_subscription_candidates')
        .select('*')
        .in('classification', ['confirmed_subscription', 'likely_subscription'])
        .order('annual_impact', { ascending: false })
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 10,
  })
}

// ── Merchant trends ────────────────────────────────────────────────────────
export function useMerchantTrends(minDeltaPct = 20) {
  return useQuery({
    queryKey: ['merchant_trends', minDeltaPct],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_merchant_trends')
        .select('*')
        .gt('delta_pct', minDeltaPct)
        .order('delta_clp', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 10,
  })
}

// ── Cashflow ───────────────────────────────────────────────────────────────
export function useCashflow() {
  return useQuery({
    queryKey: ['cashflow'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_cashflow')
        .select('*')
        .order('month', { ascending: false })
        .limit(13)
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 10,
  })
}

// ── Duplicate charges ──────────────────────────────────────────────────────
export function useDuplicates() {
  return useQuery({
    queryKey: ['duplicates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_duplicate_charges')
        .select('*')
        .order('avg_combined_per_month', { ascending: false })
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 10,
  })
}

// ── Transactions (paginated) ───────────────────────────────────────────────
export function useTransactions(page = 0, pageSize = 50, filters?: {
  category?: CategorySlug | ''
  accountId?: string
  month?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['transactions', page, pageSize, filters],
    queryFn: async () => {
      let q = supabase
        .from('transactions')
        .select('id,date,description_clean,description_raw,amount,currency,category_slug,account_id,notes,receipt_url', { count: 'exact' })
        .order('date', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (filters?.category)   q = q.eq('category_slug', filters.category)
      if (filters?.accountId)  q = q.eq('account_id', filters.accountId)
      if (filters?.month)      q = q.gte('date', filters.month + '-01').lt('date', nextMonth(filters.month) + '-01')
      if (filters?.search)     q = q.ilike('description_raw', `%${filters.search}%`)

      const { data, error, count } = await q
      if (error) throw error
      return { data: data ?? [], total: count ?? 0 }
    },
    staleTime: 1000 * 60 * 2,
  })
}

function nextMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

// ── Accounts ───────────────────────────────────────────────────────────────
export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id,name,bank,type,currency')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 60 * 60,
  })
}

// ── Update category (mutation) ─────────────────────────────────────────────
export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, category }: { id: string; category: CategorySlug }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ category_slug: category })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['insights'] })
      qc.invalidateQueries({ queryKey: ['monthly_summary'] })
    },
  })
}

// ── Transactions for a specific merchant (drilldown) ──────────────────────
export function useMerchantTransactions(merchant: string | null) {
  return useQuery({
    queryKey: ['tx_merchant', merchant],
    enabled: !!merchant,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id,date,description_clean,description_raw,amount,currency,category_slug,account_id')
        .ilike('description_clean', `%${merchant}%`)
        .order('date', { ascending: false })
        .limit(50)
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 60 * 5,
  })
}

// ── Loans ──────────────────────────────────────────────────────────────────
export function useLoans() {
  return useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .order('end_date')
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 60 * 60,
  })
}
