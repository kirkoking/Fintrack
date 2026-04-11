# Fintrack — Implementation Plan

**Owner:** Claude Code (autonomous)
**Review:** Kirk (async)
**Goal:** Ship a working Financial Brain, not a perfect one. Velocity > polish.

---

## ✅ Wave A — Supabase insight engine (COMPLETED)

Done in a previous chat session. Views live in production:
- `life_events` table (seeded with Feb-Mar 2026 grief period)
- `v_baseline_monthly`
- `v_monthly_summary`
- `v_subscription_candidates` (with `is_essential` flag)
- `v_duplicate_charges`
- `v_merchant_trends`
- `v_cashflow`
- `v_insights_feed` (the big one — natural-language cards)

**Verify on session start:** `SELECT COUNT(*) FROM v_insights_feed;` should return > 0.

---

## 🌊 Wave B — Data quality cleanup (START HERE)

The Supabase data has known issues that distort every calculation. Fix before building anything on top.

### B.1 — Purge junk
```sql
-- Zero-amount rows (OCR noise)
DELETE FROM transactions WHERE amount = 0;

-- Future-dated rows (OCR read "08/04" as "2028-04-08")
DELETE FROM transactions WHERE date > CURRENT_DATE + INTERVAL '7 days';

-- Very old orphans (pre-2024) — review first, don't bulk delete
SELECT * FROM transactions WHERE date < '2024-01-01';
```

### B.2 — Fix sign/type consistency
```sql
-- Transactions marked expense but with positive amount → flip sign
UPDATE transactions
SET amount = -amount
WHERE transaction_type = 'expense' AND amount > 0;
```

### B.3 — Backfill missing hashes
```sql
UPDATE transactions
SET hash = encode(digest(
  date::text || '|' || COALESCE(description_raw, '') || '|' || amount::text || '|' || COALESCE(account_id::text, 'none'),
  'md5'
), 'hex')
WHERE hash IS NULL;
```

### B.4 — Add guardrail triggers
```sql
-- Auto-hash trigger: any insert without hash gets one computed
CREATE OR REPLACE FUNCTION auto_hash_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hash IS NULL THEN
    NEW.hash = encode(digest(
      NEW.date::text || '|' || COALESCE(NEW.description_raw,'') || '|' || NEW.amount::text || '|' || COALESCE(NEW.account_id::text,'none'),
      'md5'
    ), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_hash
BEFORE INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION auto_hash_transaction();

-- Sanity check constraint: no far-future dates
ALTER TABLE transactions
ADD CONSTRAINT chk_sane_date
CHECK (date BETWEEN '2020-01-01' AND CURRENT_DATE + INTERVAL '7 days');

-- No zero amounts
ALTER TABLE transactions
ADD CONSTRAINT chk_nonzero_amount
CHECK (amount <> 0);
```

### B.5 — Auto-match receipts trigger
When a new transaction arrives, look for pending receipts that match (±$50 CLP, ±2 days):

```sql
CREATE OR REPLACE FUNCTION auto_match_receipts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE receipts
  SET transaction_id = NEW.id,
      status = 'matched'
  WHERE status = 'pending'
    AND transaction_id IS NULL
    AND ABS(total_amount - ABS(NEW.amount)) <= 50
    AND receipt_date BETWEEN NEW.date - INTERVAL '2 days'
                         AND NEW.date + INTERVAL '2 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_match_receipts
AFTER INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION auto_match_receipts();
```

**Commit message:** `fix(data): purge junk + add guardrail triggers`

---

## 🌊 Wave C — Frontend refactor (React + Tailwind + shadcn)

### C.1 — Bootstrap
```bash
# Use the web-artifacts-builder skill
bash /mnt/skills/examples/web-artifacts-builder/scripts/init-artifact.sh fintrack-web
cd fintrack-web
```

### C.2 — Core components (in order)

1. **`lib/supabase.ts`** — typed Supabase client + TanStack Query hooks for each view
2. **`components/InsightCard.tsx`** — renders a single `v_insights_feed` row (severity color-coded, action button, dismissible)
3. **`components/InsightFeed.tsx`** — grid of InsightCards, the hero of the dashboard
4. **`components/CashflowBadge.tsx`** — sticky header pill showing this month's net flow
5. **`components/CategoryComparison.tsx`** — side-by-side "this month vs baseline" table
6. **`components/MerchantTrend.tsx`** — merchant with sparkline + delta
7. **`components/SubscriptionList.tsx`** — auto-discovered subs, essential vs optional sections
8. **`components/TransactionTable.tsx`** — the existing table, but with better filters and drilldown
9. **`components/DrilldownModal.tsx`** — click any number → see underlying transactions

### C.3 — Views

- `views/Dashboard.tsx` — InsightFeed on top, then CashflowBadge, CategoryComparison, MerchantTrend grid
- `views/Transactions.tsx` — TransactionTable with all filters
- `views/Subscriptions.tsx` — SubscriptionList
- `views/Loans.tsx` — Progress bars + payment history
- `views/Import.tsx` — the upload flow (port from `legacy/index.html`)

### C.4 — Design non-negotiables

- **DM Serif Display** for numeric hero values and headings
- **DM Mono** for all numeric data in tables, labels, dates
- **DM Sans** for body copy
- **Dark mode first**, light mode as toggle
- **No purple gradients, no uniform rounding** (mix radii by element type)
- **Mobile-first** — Kirk uses this on his phone while tired
- **Swipe-to-dismiss** on InsightCards (Framer Motion)
- **Drill-down pattern**: every number is clickable → opens modal with backing transactions

### C.5 — Bundle
```bash
bash /mnt/skills/examples/web-artifacts-builder/scripts/bundle-artifact.sh
# produces bundle.html — single file, ready to host anywhere
```

**Commit message:** `feat(web): migrate dashboard to React + shadcn`

---

## 🌊 Wave D — Parser cascade (Gemini primary, Claude fallback)

### D.1 — Add Gemini service
Create `fintrack-bot/services/gemini_service.py`:

```python
import google.generativeai as genai
import os, json

genai.configure(api_key=os.getenv("GOOGLE_AI_API_KEY"))
MODEL = genai.GenerativeModel("gemini-2.5-flash")

def parse_with_gemini(content, system_prompt: str) -> dict:
    """Try Gemini first. Return None if it fails — caller falls back to Claude."""
    try:
        response = MODEL.generate_content([system_prompt, content])
        text = response.text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(text)
        # Validation: must have transactions array
        if not isinstance(parsed.get("transactions"), list):
            return None
        # Confidence check: if >30% of tx have null key fields, reject
        txs = parsed["transactions"]
        if not txs:
            return None
        null_rate = sum(1 for t in txs if not t.get("date") or not t.get("amount")) / len(txs)
        if null_rate > 0.3:
            return None
        return parsed
    except Exception:
        return None
```

### D.2 — Wire into `claude_service.py`

Wrap the existing Claude calls so Gemini tries first:

```python
from services import gemini_service

def parse_image(base64_image, user_comment=""):
    # Try Gemini first
    try:
        result = gemini_service.parse_with_gemini(
            {"mime_type": "image/jpeg", "data": base64_image},
            _build_extraction_prompt("receipt image")
        )
        if result:
            return result
    except Exception:
        pass
    # Fallback to Claude (original implementation)
    return _parse_image_claude(base64_image, user_comment)
```

### D.3 — Image preprocessing with image-enhancer skill

For receipts that are hard to read, preprocess before sending to parser:

```python
def enhance_if_needed(image_bytes: bytes) -> bytes:
    """Use image-enhancer skill to improve OCR readability."""
    # Invoke /mnt/skills/user/image-enhancer/SKILL.md pipeline
    # Returns enhanced bytes, or original if enhancement fails
    import subprocess
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as fin:
        fin.write(image_bytes)
        input_path = fin.name

    output_path = input_path.replace(".jpg", "_enhanced.jpg")
    try:
        subprocess.run(
            ["python", "/mnt/skills/user/image-enhancer/enhance.py",
             "--input", input_path, "--output", output_path],
            check=True, timeout=30
        )
        with open(output_path, "rb") as f:
            return f.read()
    except Exception:
        return image_bytes  # fall back to original
```

Call `enhance_if_needed()` BEFORE base64 encoding for any photo that the parser struggles with (first pass confidence < threshold).

**Commit message:** `feat(parser): gemini-first cascade with image enhancement`

---

## 🌊 Wave E — Cuenta corriente / vista ingest

The `index.html` legacy importer already has a `cta` doc type with a complete system prompt. It's not being used. Activate it.

### E.1 — Port `cta` flow to the new React importer
The system prompt in `legacy/index.html` (search for `if(docType==='cta')`) has all the logic for transfer_in, transfer_out, income, expense, and counterpart extraction. Copy it verbatim into the new React component. Don't reinvent.

### E.2 — Seed cuenta corriente accounts in Supabase
```sql
INSERT INTO accounts (name, bank, type, currency) VALUES
  ('Cuenta Corriente', 'Itaú', 'checking', 'CLP'),
  ('Cuenta Corriente', 'Scotiabank', 'checking', 'CLP'),
  ('Cuenta Corriente', 'Banco de Chile', 'checking', 'CLP'),
  ('Cuenta Vista', 'Tenpo', 'checking', 'CLP'),
  ('Cuenta Mercado Pago', 'Mercado Pago', 'digital_wallet', 'CLP')
ON CONFLICT DO NOTHING;
```

(Some may already exist — `Banco de Chile · Cuenta Corriente` and `Scotiabank · Cuenta Corriente` are live.)

### E.3 — Key logic: closing the loop
When a TC payment appears on a cuenta corriente (`PAGO TC ITAU`), it should NOT be double-counted. Mark it as `transfer_out` with `category_slug = 'payment'` on the cuenta corriente side. The TC side already shows a `payment` row. The `v_cashflow` view excludes `payment` already.

**Commit message:** `feat(ingest): activate cuenta corriente flow`

---

## 🌊 Wave F — Liquidaciones de sueldo → `income` table

### F.1 — Liquidación parser
The system prompt for `liqui` already exists in `legacy/index.html`. It extracts `gross_amount`, `net_amount`, `employer`, `period_start`, `period_end`, `deductions` (jsonb), `bonuses` (jsonb).

### F.2 — Upload handler
Instead of inserting into `transactions`, insert into the `income` table:

```python
supabase.table("income").insert({
    "date": parsed["period_end"],
    "employer": parsed["employer"],
    "gross_amount": parsed["gross_amount"],
    "net_amount": parsed["net_amount"],
    "period_start": parsed["period_start"],
    "period_end": parsed["period_end"],
    "deductions": parsed.get("deductions", {}),
    "bonuses": parsed.get("bonuses", {}),
    "raw_data": parsed,
}).execute()
```

### F.3 — `v_cashflow` already handles this
No view changes needed — `v_cashflow` already unions `income.net_amount`. Just populate the table.

**Commit message:** `feat(income): liquidación parser → income table`

---

## 🌊 Wave G — "¿Cuánto puedo gastar este mes?" query

The question Kirk has asked his whole life. Build it as a stored function:

```sql
CREATE OR REPLACE FUNCTION monthly_spending_room()
RETURNS TABLE(
  month_start date,
  expected_income numeric,
  essential_fixed numeric,
  loan_payments numeric,
  already_spent numeric,
  remaining_budget numeric,
  daily_burn_rate numeric,
  days_left int
) AS $$
BEGIN
  RETURN QUERY
  WITH current_month AS (
    SELECT date_trunc('month', CURRENT_DATE)::date AS m,
           (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date AS m_end
  ),
  avg_income_3mo AS (
    SELECT AVG(total_income) AS avg_inc
    FROM v_cashflow
    WHERE month >= (SELECT m FROM current_month) - INTERVAL '3 months'
      AND month < (SELECT m FROM current_month)
  ),
  essential_total AS (
    SELECT COALESCE(SUM(avg_monthly), 0) AS total
    FROM v_subscription_candidates
    WHERE is_essential
  ),
  loan_total AS (
    SELECT COALESCE(SUM(monthly_payment), 0) AS total
    FROM loans WHERE is_active
  ),
  month_spent AS (
    SELECT COALESCE(SUM(ABS(amount)), 0) AS total
    FROM transactions
    WHERE amount < 0
      AND currency = 'CLP'
      AND category_slug NOT IN ('payment','fees','loan_payment')
      AND date >= (SELECT m FROM current_month)
      AND date <= CURRENT_DATE
  )
  SELECT
    (SELECT m FROM current_month),
    ROUND((SELECT avg_inc FROM avg_income_3mo))::numeric,
    ROUND((SELECT total FROM essential_total))::numeric,
    ROUND((SELECT total FROM loan_total))::numeric,
    ROUND((SELECT total FROM month_spent))::numeric,
    ROUND(
      (SELECT avg_inc FROM avg_income_3mo)
      - (SELECT total FROM essential_total)
      - (SELECT total FROM loan_total)
      - (SELECT total FROM month_spent)
    )::numeric,
    ROUND(
      (
        (SELECT avg_inc FROM avg_income_3mo)
        - (SELECT total FROM essential_total)
        - (SELECT total FROM loan_total)
        - (SELECT total FROM month_spent)
      ) / NULLIF((SELECT m_end FROM current_month) - CURRENT_DATE + 1, 0)
    )::numeric,
    (SELECT m_end FROM current_month) - CURRENT_DATE + 1;
END;
$$ LANGUAGE plpgsql;
```

The dashboard's CashflowBadge calls `SELECT * FROM monthly_spending_room()` and renders:

> **Puedes gastar $X/día por los próximos Y días** (o "Te pasaste, ajusta el ritmo" si negative).

**Commit message:** `feat(insights): monthly spending room calculator`

---

## 🌊 Wave H — Autonomous alerts (OPTIONAL — after H+)

Supabase cron → Edge Function → Telegram message to Kirk when:
- New insight with severity ≥ 3 appears
- Monthly spending room goes negative
- A subscription appears that wasn't there before
- A duplicate charge is detected in the current month

Don't build this until Waves B–G are done.

---

## 🎬 Final deliverable

After all waves complete, Kirk should be able to open `fintrack.html` on his phone at 11pm while tired, and within 3 seconds know:

1. **"Am I on track this month?"** — CashflowBadge, one glance
2. **"What changed?"** — InsightFeed, 3-5 cards
3. **"Is there a duplicate I should kill?"** — Duplicate cards highlighted
4. **"How much can I spend tomorrow without guilt?"** — Daily burn rate

No thinking required. The system does the thinking.

---

## 📝 Session log convention

Every autonomous Claude Code session writes to `STATUS.md`:

```markdown
## Session YYYY-MM-DD HH:MM

**Wave:** B.3
**Done:**
- Backfilled 404 missing hashes
- Added auto-hash trigger
- Tests: 12 passed, 0 failed

**Next:**
- Wave B.4: guardrail constraints

**Blockers:** none
```
