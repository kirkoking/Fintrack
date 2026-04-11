# Fintrack Database Schema

**Project:** `japiqczoxgxnygwakmcm` (Supabase)
**Last updated:** 2026-04-11 (post Wave A)

---

## Tables

### `transactions` — the core table (1,981 rows)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid → accounts | Nullable (175 orphans to clean up) |
| `import_id` | uuid → imports | Nullable (99% not set — pre-import tracking) |
| `date` | date | Sanity constraint: 2020-01-01 to CURRENT_DATE+7 |
| `description_raw` | text | Original bank string |
| `description_clean` | text | Normalized via merchant_rules |
| `amount` | numeric | **Negative = expense/charge, Positive = income/credit** |
| `currency` | text | Default 'CLP' |
| `category_slug` | text → categories | CHECK in {food,transport,shopping,health,entertainment,fitness,personal_care,utilities,housing,fees,loan_payment,payment,other,travel,donations,subscriptions,pets,education} |
| `transaction_type` | text | CHECK in {expense,transfer_out,transfer_in,income} |
| `is_recurring` | bool | Default false |
| `installment_current` | int | For cuotas |
| `installment_total` | int | |
| `notes` | text | |
| `receipt_id` | uuid → receipts | |
| `hash` | text | Unique, for dedup. Auto-computed on insert (Wave B.4) |
| `counterpart_name` | text | For transfers — who |
| `counterpart_rut` | text | |
| `counterpart_bank` | text | |
| `bank_reference` | text | Operation number |
| `receipt_url` | text | Direct Drive link |
| `product_code` | text | |
| `card_last_four` | text | |
| `created_at` | timestamptz | |

**Key invariant:** `transaction_type='expense'` must have `amount < 0`. Enforced via Wave B.4 data cleanup.

---

### `accounts` (8 rows)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | e.g. "TC Nacional" |
| `bank` | text | e.g. "Itaú" |
| `type` | text | credit_card, checking, savings, digital_wallet |
| `currency` | text | CLP or USD |
| `last_four` | text | For auto-detection from statements |
| `is_active` | bool | |
| `notes` | text | |

**Current accounts:**
- Itaú TC Nacional (442 tx)
- Tenpo TC Digital (350 tx)
- Banco de Chile TC Nacional (348 tx)
- CMR Falabella TC CMR (279 tx)
- Banco de Chile Cuenta Corriente (155 tx)
- Scotiabank TC Nacional (97 tx)
- Banco de Chile TC Internacional USD (74 tx)
- Scotiabank Cuenta Corriente (61 tx)

---

### `categories` (18 rows)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `slug` | text UNIQUE | FK target for transactions.category_slug |
| `name_es` | text | Display name |
| `color` | text | Hex |
| `icon` | text | Emoji or icon name |
| `is_system` | bool | |

**Category slugs (18):** food, transport, shopping, health, fitness, entertainment, personal_care, housing, utilities, loan_payment, fees, payment, other, travel, donations, subscriptions, pets, education

---

### `life_events` (NEW — Wave A)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `start_date` | date | |
| `end_date` | date | |
| `label` | text | Human-readable |
| `kind` | text | 'exceptional', 'grief', 'medical', 'travel', 'moving' |
| `exclude_from_baseline` | bool | Default true |
| `notes` | text | |

**Current rows:**
- `2026-02-01` → `2026-03-31` — "Fallecimiento del padre" (grief)

**To remove:** `DELETE FROM life_events WHERE label = 'Fallecimiento del padre';`

---

### `receipts` (30 rows)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `transaction_id` | uuid → transactions | Null until matched |
| `merchant_name` | text | |
| `receipt_date` | date | |
| `total_amount` | numeric | |
| `currency` | text | |
| `items` | jsonb | Parsed line items |
| `image_url` | text | Drive backup |
| `status` | text | 'pending', 'matched', 'unmatched' |
| `raw_text` | text | |

**Auto-match trigger** (Wave B.5) links receipts to transactions when amount/date align.

---

### `imports` (14 rows)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid → accounts | |
| `source_file` | text | |
| `source_type` | text | 'pdf','xlsx','image' |
| `period_start`, `period_end` | date | |
| `row_count`, `inserted_count`, `skipped_count` | int | |
| `status` | text | 'pending','processing','done','error' |
| `drive_url`, `drive_file_id` | text | |
| `original_filename`, `standardized_filename` | text | |
| `bank_detected` | text | |
| `user_note` | text | |
| `imported_at` | timestamptz | |

**Currently underused** — only 20/1981 transactions reference an import_id. Wave C.1 enforces this for new uploads.

---

### `income` (0 rows — empty, Wave F priority)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `import_id` | uuid → imports | |
| `date` | date | |
| `employer` | text | |
| `gross_amount` | numeric | |
| `net_amount` | numeric | The actual deposit |
| `period_start`, `period_end` | date | |
| `deductions` | jsonb | {"afp": X, "salud": Y, "impuesto": Z} |
| `bonuses` | jsonb | |
| `raw_data` | jsonb | Full parsed liquidación |

---

### `loans` (2 rows)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | |
| `bank` | text | |
| `loan_number` | text | |
| `type` | text | |
| `original_amount`, `current_balance` | numeric | |
| `monthly_payment` | numeric | |
| `interest_rate` | numeric | |
| `total_cuotas`, `paid_cuotas` | int | |
| `start_date`, `end_date` | date | |
| `payment_schedule` | jsonb | |

**Current loans:**
- Scotiabank Personal Loan: $551,755/mes, ends Nov 2028
- Banco de Chile Consumer Loan: $445,634/mes, ends Dec 2028

---

### `merchant_rules` (78 rows)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `raw_pattern` | text UNIQUE | Match pattern |
| `normalized_name` | text | |
| `category_slug` | text → categories | |
| `notes` | text | |

**Underused by current bot** — Wave D should consult this before calling LLM for category.

---

## Views (all created in Wave A)

### `v_monthly_summary`
Month × category × currency aggregates with `is_exceptional` flag.
```sql
SELECT * FROM v_monthly_summary WHERE NOT is_exceptional ORDER BY month DESC;
```

### `v_baseline_monthly`
Per-category "normal" monthly spending. Excludes life_events + current month.
```sql
SELECT category_slug, baseline_avg, months_sampled FROM v_baseline_monthly ORDER BY baseline_avg DESC;
```

### `v_subscription_candidates`
Auto-discovered recurring charges with classification and essential flag.
```sql
SELECT merchant, avg_monthly, annual_impact, classification, is_essential
FROM v_subscription_candidates
WHERE classification IN ('confirmed_subscription','likely_subscription')
ORDER BY annual_impact DESC;
```

### `v_duplicate_charges`
Real duplicates: same merchant charged in the same month on ≥2 accounts.
```sql
SELECT * FROM v_duplicate_charges ORDER BY avg_combined_per_month DESC;
```

### `v_merchant_trends`
Last full month vs historical average per merchant (excluding life_events).
```sql
SELECT merchant, latest_total, historical_avg, delta_pct FROM v_merchant_trends WHERE delta_pct > 40 ORDER BY delta_clp DESC;
```

### `v_cashflow`
Month-by-month income vs expenses.
```sql
SELECT month, total_income, total_expenses, net_flow FROM v_cashflow ORDER BY month DESC LIMIT 12;
```

### `v_insights_feed` — the hero view
Pre-generated natural-language insight cards for the dashboard.
```sql
SELECT kind, severity, title, body, merchant, category_slug, annual_impact, evidence
FROM v_insights_feed
ORDER BY severity DESC, annual_impact DESC
LIMIT 10;
```

Columns:
- `kind`: category_spike, category_drop, duplicate_charge, savings_opportunity, essential_fixed, merchant_spike
- `severity`: 1 (info) to 4 (urgent)
- `title`: short headline (with emoji)
- `body`: full Spanish sentence with numbers
- `merchant` / `category_slug`: nullable, for drill-down
- `delta_clp`: the $ impact
- `annual_impact`: annualized
- `evidence`: jsonb with raw numbers

---

## Known data quality issues (Wave B fixes)

| Issue | Rows | Fix |
|---|---|---|
| Zero-amount rows | 104 | `DELETE WHERE amount=0` |
| Future dates | 6 | `DELETE WHERE date > today+7d` |
| Very old dates | 7 | Review manually |
| Missing hash | 404 | Backfill + trigger |
| No account_id | 175 | Re-match via twin tx or add `card_last_four` detection |
| No import_id | 1,961 | Enforce on new uploads (Wave C.1) |
| Sign mismatches | 22 | `UPDATE amount = -amount WHERE expense AND positive` |
| Pending receipts unmatched | 5 | Auto-match trigger (Wave B.5) |

---

## Credentials (for Claude Code — stored in .env)

```bash
SUPABASE_URL=https://japiqczoxgxnygwakmcm.supabase.co
SUPABASE_ANON_KEY=<already in legacy HTML files, copy from there>
ANTHROPIC_API_KEY=<existing>
GOOGLE_AI_API_KEY=<new for Gemini — Kirk needs to create on https://aistudio.google.com/>
TELEGRAM_BOT_TOKEN=<existing>
```

Never commit `.env`. It's in `.gitignore`.
