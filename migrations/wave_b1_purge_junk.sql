-- Wave B.1: Purge junk rows
-- Applied: 2026-04-11
-- Removed: 104 zero-amount, 6 future-dated (2028), 7 pre-2024 orphans
-- 1981 → 1864 transactions

-- Step 1: unlink receipts that reference junk transactions (amount=0)
-- 3 MercadoPago receipts had real amounts but their tx had OCR-zero amount.
-- Reset to pending so the B.5 auto-match trigger can re-link them correctly.
UPDATE receipts
SET transaction_id = NULL,
    status = 'pending'
WHERE transaction_id IN (
    SELECT id FROM transactions WHERE amount = 0
);

-- Step 2: Zero-amount rows (OCR noise)
DELETE FROM transactions WHERE amount = 0;

-- Step 3: Future-dated rows (OCR misread, e.g. "08/02" → 2028-02-08)
DELETE FROM transactions WHERE date > CURRENT_DATE + INTERVAL '7 days';

-- Step 4: Pre-2024 orphans (all 7 = Restaurante SDG 2020-03-01, no account_id)
DELETE FROM transactions WHERE date < '2024-01-01';
