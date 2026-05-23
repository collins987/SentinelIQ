-- Add missing loan columns to align with SQLAlchemy model
-- Safe to run multiple times
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS interest_policy_id VARCHAR,
ADD COLUMN IF NOT EXISTS repayments_frozen BOOLEAN DEFAULT FALSE;

-- Add FK if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_loans_interest_policy'
  ) THEN
    ALTER TABLE loans
    ADD CONSTRAINT fk_loans_interest_policy
    FOREIGN KEY (interest_policy_id) REFERENCES interest_policies(id);
  END IF;
END $$;
