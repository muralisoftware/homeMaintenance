/*
  # Add missing columns and loan_payments table

  1. Changes
    - Add `expiry_date` column to `documents` table
    - Add `family_id` column to `subscriptions` table
    - Add `family_id` column to `loans` table
    - Add `is_active` column to `loans` table
    - Add `notes` column to `loans` table
    - Create `loan_payments` table for EMI payment history
    - Add `file_type` column to `documents`

  2. Security
    - Enable RLS on `loan_payments`
    - Add restrictive policies for loan_payments
*/

-- Add missing columns to documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'expiry_date'
  ) THEN
    ALTER TABLE documents ADD COLUMN expiry_date date DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'file_type'
  ) THEN
    ALTER TABLE documents ADD COLUMN file_type text DEFAULT '';
  END IF;
END $$;

-- Add family_id to subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'family_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN family_id uuid REFERENCES families(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add family_id to loans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loans' AND column_name = 'family_id'
  ) THEN
    ALTER TABLE loans ADD COLUMN family_id uuid REFERENCES families(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add is_active to loans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loans' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE loans ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Add notes to loans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loans' AND column_name = 'notes'
  ) THEN
    ALTER TABLE loans ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;

-- Create loan_payments table
CREATE TABLE IF NOT EXISTS loan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments for own loans"
  ON loan_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payments for own loans"
  ON loan_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payments for own loans"
  ON loan_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
    )
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
