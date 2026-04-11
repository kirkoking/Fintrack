# Fintrack — STATUS

## Sesión 2026-04-11 (continuación)

**Wave:** C completa (React dashboard)
**Estado:** ✅ DONE — Wave C completa. App corriendo en `web/`. Listo para revisión antes de Wave D.

Para ver localmente:
```bash
cd web && npm install && npm run dev
# Abre http://localhost:5173
```

---

## Wave C — React dashboard (`7196384`)

### Lo que se construyó

**Stack:** Vite 5 + React 18 + TypeScript + Tailwind 3.4 + TanStack Query + Framer Motion

**Carpeta:** `web/` en el repo

**Verificado en browser:** todas las tabs, drilldown modal, animaciones, datos reales de Supabase

### Componentes

| Componente | Descripción |
|---|---|
| `lib/supabase.ts` | Cliente tipado, tipos, helpers `clp()`, constantes de categorías |
| `hooks/useFintrack.ts` | TanStack Query hooks para todas las vistas Wave A |
| `InsightCard` | Swipe-to-dismiss (Framer Motion), severity color-coded, "Ver detalle" |
| `InsightFeed` | Grid 2 cols, skeleton loading, AnimatePresence |
| `CashflowBadge` | Flujo neto + daily burn rate |
| `CategoryComparison` | Este mes vs baseline, delta %, esenciales marcados como tal |
| `MerchantTrend` | Top merchants con cambio >20% vs histórico |
| `SubscriptionList` | Secciones Esenciales / Opcionales — **nunca sugiere cortar esenciales** |
| `TransactionTable` | Paginado 50/pág, filtros múltiples, edición inline de categoría |
| `DrilldownModal` | Bottom sheet spring animation, tx por merchant |

### Vistas / Tabs

| Tab | Contenido |
|---|---|
| 🧠 Inicio | CashflowBadge + InsightFeed + CategoryComparison + MerchantTrend |
| 📋 Movimientos | TransactionTable con todos los filtros |
| 🔄 Suscripciones | SubscriptionList con total anual |
| 💳 Créditos | Progress bars, cuotas, saldo, tasa, término |

### Pendiente / notas

- **Wave C.5 (bundle único):** El output actual es `dist/` (Vite). Para producción como `.html` único se puede usar `vite-plugin-singlefile`. No implementado aún.
- **Income data:** La tabla `income` sigue vacía → CashflowBadge muestra $0 ingresado. Wave F lo resuelve.
- **Interest rates en Créditos:** Valores en DB parecen en formato decimal bajo (0.02% en pantalla). Es dato, no bug de código.
- **Wave D (parser cascade Gemini):** NO iniciar sin aprobación de Kirk.

---

## Sesión 2026-04-11

**Wave:** B completa (B.1 → B.5)
**Estado:** ✅ DONE

---

## Resumen de cambios

### B.1 — Purgar junk (`fb1d0b8`)
- Eliminadas **104 filas de amount=0** (ruido OCR)
- Eliminadas **6 filas con fecha futura** (OCR leyó "08/02" como 2028-02-08)
- Eliminadas **7 filas pre-2024** (Restaurante SDG 2020-03-01, sin account_id, test data)
- 3 receipts de MercadoPago desvinculados de sus tx-zero y reseteados a `pending`
- **1981 → 1864 transactions**

### B.2 — Fix signo/tipo (`7cf4274`)
- Corregidas **22 filas** donde `transaction_type='expense'` tenía `amount > 0`
- Ahora cumple el invariante: expense siempre negativo

### B.3 — Backfill hashes (`fe7a3d1`)
- Detectados y eliminados **8 duplicados reales** entre las filas sin hash:
  - ANTHROPIC SAN FRANCISCO ×4 (mismo día, misma cuenta, mismo monto)
  - QUESILLO ×2, DESCUENTO RNR ×2, PAELLA UN ×2, PAN RINCON ×2, DONUTS ×2
- Backfill de **290 hashes** en el resto
- **1864 → 1856 transactions**, 0 NULL hashes

### B.4 — Guardrail triggers (`53d9b7a`)
- `trg_auto_hash`: trigger BEFORE INSERT que computa md5 si hash es NULL
- `chk_sane_date`: constraint que bloquea fechas fuera de 2020-01-01..hoy+7d
- `chk_nonzero_amount`: constraint que bloquea amount=0

### B.5 — Auto-match receipts (`0eb0dfe`)
- `trg_auto_match_receipts`: trigger AFTER INSERT, enlaza receipts pending
  con nuevas transactions dentro de ±50 CLP y ±2 días
- Re-match manual de 2 recibos confirmados (Japi Jane, Epic Games)
- **24 receipts matched, 6 pending** (sin tx matching disponible)

---

## Estado final de la DB

| Métrica | Antes | Después |
|---|---|---|
| Total transactions | 1,981 | **1,856** |
| Hashes NULL | 404 | **0** |
| Amount = 0 | 104 | **0** |
| Fechas futuras | 6 | **0** |
| Fechas pre-2024 | 7 | **0** |
| Expenses con amount > 0 | 22 | **0** |
| Receipts matched | ~22 | **24** |
| Receipts pending | ~8 | **6** |
| `life_events` "Fallecimiento del padre" | ✅ intacto | ✅ intacto |

---

## Receipts pendientes sin match (Kirk revisar)

| Merchant | Fecha | Monto | Motivo sin match |
|---|---|---|---|
| IKEA | 2026-03-03 | null | Sin monto — no matcheable automáticamente |
| Wood & Music SpA | 2026-03-21 | $44,390 | Falso positivo excluido (INTERÉS ROTATIVO ≠ Wood&Music) |
| DLocal Chile SPA | 2026-03-28 | $21,792 | Su tx original tenía amount=0, fue purgada en B.1 |
| Tiana Joyas | 2026-03-21 | $109,990 | Su tx original tenía amount=0, fue purgada en B.1 |
| Temu.com (PayPal) | 2026-03-28 | $69,835 | Sin tx matching en el rango ±50 CLP / ±2 días |
| MyHeritage | 2026-04-03 | null | Sin monto — no matcheable automáticamente |

---

## Próximo paso

**Wave C — Frontend refactor (React + Tailwind + shadcn)**

⚠️ **NO iniciar sin aprobación de Kirk.**

Wave C requiere:
1. Bootstrap del proyecto React (`fintrack-web/`)
2. Conexión Supabase con TanStack Query
3. Componentes en orden: InsightCard → InsightFeed → CashflowBadge → etc.

Ver `PLAN.md` sección Wave C para detalle completo.

---

## Commits Wave B

```
fb1d0b8  fix(data): Wave B.1 — purge junk transactions
7cf4274  fix(data): Wave B.2 — flip sign on 22 expense rows with positive amount
fe7a3d1  fix(data): Wave B.3 — dedup + backfill hashes on all transactions
53d9b7a  fix(data): Wave B.4 — add guardrail triggers and constraints
0eb0dfe  fix(data): Wave B.5 — auto-match receipts trigger + one-time re-match
```
