-- Wave B.2: Fix sign/type consistency
-- Applied: 2026-04-11
-- Fixed 22 expense rows that had positive amounts (should be negative)

UPDATE transactions
SET amount = -amount
WHERE transaction_type = 'expense' AND amount > 0;
