# Fintrack — Financial Brain for Kirk

> **Mission:** This is not a dashboard. This is a **cognitive prosthesis** for a person with ADHD who loses financial visibility during periods of emotional strain. The system's job is to track, interpret, and *speak* in plain Spanish when Kirk can't process numbers himself.

---

## 🧠 Who you're working for

- **User:** Kirk King (31, Chilean-American, ADHD, Marketing Lead at Decathlon Chile).
- **Language:** Spanish (Chile) primary. Spanglish is natural. Never English-only.
- **Communication rule:** ADHD-optimized — bullets, bold key concepts, short sentences. Never walls of text.
- **Emotional context:** Kirk's father passed away in Feb 2026. That period is flagged as `life_event` and excluded from baselines.
- **His actual pain:** "Me ha costado hacer un budget toda mi vida. No sé cuánto gasto mes a mes. A veces pierdo el control y la visibilidad."

---

## 🎯 Non-negotiable product principles

1. **Never suggest cutting essential categories** (`health`, `housing`, `utilities`, `education`) or anything tagged `is_essential`. Even if the math says "you'd save $X". Health is not a budget line — it's a human need.

2. **Never shame-frame.** No "you overspent", "you should have", "why did you". Use: "esto se pasó de lo normal", "esto es información útil", "¿quieres verlo?"

3. **BLUF (Bottom Line Up Front).** Every response leads with the answer. Detail is optional layer 2.

4. **Respect `life_events`.** Never include those periods in baselines or "normal" calculations. If you do, Kirk will get a notification telling him his "average" spending includes the month his father died.

5. **Income is the missing leg.** Without `income` data populated, the system is half-blind. Parsing liquidaciones de sueldo and cuenta corriente statements is HIGH priority.

6. **Kirk uses this while tired, stressed, or avoiding.** Every UI decision should reduce friction. Never require him to remember category names, account IDs, or SQL. The system remembers for him.

---

## 📦 Repository layout

```
fintrack/
├── fintrack-bot/          # Python Telegram bot (existing — has bugs)
│   ├── handlers/
│   ├── services/
│   └── main.py
├── web/                   # NEW — React dashboard (target of refactor)
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   ├── lib/supabase.ts
│   │   └── App.tsx
│   └── index.html
├── legacy/                # OLD — the current vanilla HTML (archive)
│   ├── fintrack.html      # current dashboard
│   └── index.html         # current importer
└── docs/
    ├── CLAUDE.md          # this file
    ├── PLAN.md            # phased implementation plan
    └── SCHEMA.md          # database schema reference
```

---

## 🗄️ Database (Supabase)

- **Project ID:** `japiqczoxgxnygwakmcm`
- **URL:** `https://japiqczoxgxnygwakmcm.supabase.co`
- **Anon key:** stored in `.env` as `SUPABASE_ANON_KEY` (already in legacy HTML files — copy from there)
- **Full schema:** see `SCHEMA.md`

**Tables you'll touch most:** `transactions`, `accounts`, `categories`, `income`, `receipts`, `imports`, `life_events`.

**Views already created (Wave A complete):**
- `v_monthly_summary` — month × category × currency totals with exceptional flag
- `v_baseline_monthly` — per-category "normal" spending (excludes life_events + current month)
- `v_subscription_candidates` — auto-discovered subscriptions with `is_essential` flag
- `v_duplicate_charges` — real duplicates (same merchant, same month, multiple accounts)
- `v_merchant_trends` — last month vs historical avg per merchant
- `v_cashflow` — income vs expenses per month
- `v_insights_feed` — natural-language insight cards (the big one)

**Query `v_insights_feed` first** when building any UI that shows "what should I know?". It does the NLP in SQL.

---

## 🛠️ Tech stack

### Backend
- **Supabase** (PostgreSQL 15, REST API, Edge Functions when needed)
- **Python 3.11** for the Telegram bot (`python-telegram-bot` v20)
- **Claude API** (claude-sonnet-4-20250514) as parsing fallback
- **Gemini 2.5 Flash** as primary parser (free, good enough for ~80% of docs)

### Frontend (target)
- **React 18 + TypeScript** via Vite
- **Tailwind CSS 3.4** + **shadcn/ui**
- **Recharts** for charts (NOT chart.js — React-native)
- **Framer Motion** for gestures/animations
- **TanStack Query** for Supabase data fetching (cache, refetch, optimistic)
- Final artifact: single bundled `.html` via Parcel + html-inline

### Design system
- **Dark by default**, light toggle persisted to localStorage
- **Accent green:** `#c8f060` (dark) / `#4a7a00` (light)
- **Fonts:** DM Serif Display (headings), DM Sans (body), DM Mono (numeric/labels)
- **Never** use: Inter, purple gradients, excessive centered layouts, uniform rounded corners
- Numeric values = DM Mono always. Headlines = DM Serif. Body = DM Sans.

---

## 🚦 How to work autonomously

You have full permission to:
- Edit any file in `fintrack/`
- Run `npm`, `pip`, `git`, `bash` commands
- Create Supabase migrations via the `Supabase:apply_migration` tool (project_id above)
- Commit and push to the `kirkoking/Fintrack` GitHub repo
- Install dependencies
- Refactor freely

**What to NOT do without asking:**
- Delete data (transactions, receipts, income)
- Change the Supabase schema of existing tables (add columns is fine; drop/rename is not)
- Modify `life_events` row for "Fallecimiento del padre"
- Publish/deploy to production (no auto-deploy — wait for Kirk to review)

**When you finish a phase:**
1. Commit with a clear message
2. Run `git push`
3. Write a short summary in `STATUS.md` at repo root with: what was done, what's next, any blockers, screenshots if relevant
4. If tests exist, run them and report results

**When you hit a blocker:**
1. Document it in `STATUS.md`
2. Try ONE alternative path
3. If still blocked, stop and write clear context for Kirk to unblock

---

## 🪓 Style guide for Claude Code's own commits

- Commit messages: imperative mood, Spanish or English (Kirk reads both)
- Small commits, one concern each
- Never mass-refactor without a reason
- Leave breadcrumbs: `// TODO(kirk): ...` for things he should review

---

## 🧪 Testing philosophy

- **Manual smoke tests** are fine for the dashboard (Kirk will click around)
- **Required tests** for: the parser cascade (Gemini → Claude fallback), the hash/dedup logic, any SQL view that affects insights
- **Snapshot tests** for insight text (so we don't accidentally change Kirk-safe phrasing)

---

## 📞 Escalation

If you're genuinely stuck and need Kirk:
1. Write `BLOCKED.md` at repo root with: the question, 2-3 proposed options, your recommendation
2. Commit it with `[BLOCKED]` in the message
3. Stop work and wait

Don't spin indefinitely. Don't guess on ethically sensitive decisions (anything about essential expenses, life_events, income categorization).

---

## 🌱 Long-term vision

Fintrack will eventually:
- Auto-ingest Gmail purchase confirmations (Edge Function + Gmail API cron)
- Generate monthly "financial briefings" via WhatsApp/Telegram
- Project debt-free date dynamically as payments happen
- Alert Kirk proactively when patterns shift (not after the fact)
- Integrate life_events from his calendar automatically (vacation → expect higher spend)

You don't need to build all of this. Just don't close doors on it with your architecture choices.
