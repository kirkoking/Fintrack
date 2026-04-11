-- Wave B.4: Guardrail triggers and constraints
-- Applied: 2026-04-11

-- 1. Auto-hash trigger: any INSERT without hash gets md5 computed on the fly
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

DROP TRIGGER IF EXISTS trg_auto_hash ON transactions;
CREATE TRIGGER trg_auto_hash
BEFORE INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION auto_hash_transaction();

-- 2. Sanity date constraint: no OCR-misread future/ancient dates
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS chk_sane_date;

ALTER TABLE transactions
ADD CONSTRAINT chk_sane_date
CHECK (date BETWEEN '2020-01-01' AND CURRENT_DATE + INTERVAL '7 days');

-- 3. No zero amounts
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS chk_nonzero_amount;

ALTER TABLE transactions
ADD CONSTRAINT chk_nonzero_amount
CHECK (amount <> 0);
