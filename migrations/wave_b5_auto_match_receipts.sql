-- Wave B.5: Auto-match receipts trigger
-- Applied: 2026-04-11

-- Trigger: when a new transaction is inserted, auto-link pending receipts
-- that match within ±50 CLP and ±2 days
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

DROP TRIGGER IF EXISTS trg_auto_match_receipts ON transactions;
CREATE TRIGGER trg_auto_match_receipts
AFTER INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION auto_match_receipts();

-- One-time manual re-match for receipts that were pending at migration time
-- (2 confirmed matches; 1 false positive excluded; 6 remain unmatched)
-- Japi Jane: "Mp soc. com jj sp" exact amount match
UPDATE receipts SET transaction_id = '511eb18b-c970-456e-a727-c9f9c49ed07a', status = 'matched'
WHERE id = 'c0c7ddaa-e670-4515-944e-a7865de8e845';

-- Epic Games Fortnite Crew: "EPC*EPIC GAMES STORE" exact amount match
UPDATE receipts SET transaction_id = 'a5db857d-7651-43a5-a78c-06ae9974a611', status = 'matched'
WHERE id = 'e2d48bf7-aaf0-4a13-ade6-6d4f9cd97c1f';

-- Remaining 6 pending receipts have no matching transaction:
-- IKEA (null amount), Wood&Music (false positive excluded), DLocal/Tiana Joyas/Temu
-- (their original tx had amount=0, purged in B.1), MyHeritage (null amount)
-- These stay pending for Kirk to review manually.
