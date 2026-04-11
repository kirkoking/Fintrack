-- Wave B.3: Backfill missing hashes
-- Applied: 2026-04-11
-- Removed 8 true duplicates (kept oldest per group), then backfilled 290 hashes
-- Duplicates found: ANTHROPIC x4, QUESILLO x2, DESCUENTO RNR x2,
--                   PAELLA UN x2, PAN RINCON UN x2, DONUTS x2
-- Result: 1864 → 1856 transactions, 0 NULL hashes remaining

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Delete true duplicates among NULL-hash rows
-- Keep oldest (min created_at, then min id) per hash group
DELETE FROM transactions
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY encode(digest(
                       date::text || '|' || COALESCE(description_raw, '') || '|' || amount::text || '|' || COALESCE(account_id::text, 'none'),
                       'md5'
                   ), 'hex')
                   ORDER BY created_at ASC, id ASC
               ) AS rn
        FROM transactions
        WHERE hash IS NULL
    ) ranked
    WHERE rn > 1
);

-- Backfill hash on all remaining NULL-hash rows
UPDATE transactions
SET hash = encode(digest(
    date::text || '|' || COALESCE(description_raw, '') || '|' || amount::text || '|' || COALESCE(account_id::text, 'none'),
    'md5'
), 'hex')
WHERE hash IS NULL;
