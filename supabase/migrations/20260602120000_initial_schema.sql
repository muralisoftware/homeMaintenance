-- Initial Schema for HomeWallet

-- Create Families table
CREATE TABLE IF NOT EXISTS public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  family_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create Documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text NOT NULL,
  file_type text DEFAULT ''::text,
  expiry_date date,
  created_at timestamp with time zone DEFAULT now()
);

-- Create Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  amount numeric DEFAULT 0 CHECK (amount >= 0::numeric),
  renewal_date date,
  created_at timestamp with time zone DEFAULT now(),
  next_billing_date date,
  billing_cycle text,
  category text,
  provider text,
  is_active boolean DEFAULT true
);

-- Create Loans table
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  bank_name text DEFAULT ''::text,
  emi_amount numeric DEFAULT 0 CHECK (emi_amount >= 0::numeric),
  interest_rate numeric DEFAULT 0,
  start_date date DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  loan_type text DEFAULT ''::text,
  principal_amount numeric DEFAULT 0,
  outstanding_balance numeric DEFAULT 0,
  emi_due_date date,
  tenure_months integer DEFAULT 0,
  paid_months integer DEFAULT 0
);

-- Create Loan Payments table
CREATE TABLE IF NOT EXISTS public.loan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0::numeric),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0::numeric),
  category text DEFAULT ''::text,
  expense_date date DEFAULT CURRENT_DATE,
  notes text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create Bills table
CREATE TABLE IF NOT EXISTS public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  bill_name text DEFAULT ''::text,
  amount numeric DEFAULT 0 CHECK (amount >= 0::numeric),
  due_date date,
  is_paid boolean DEFAULT false,
  reminder_days integer DEFAULT 3,
  notes text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now(),
  bill_type text,
  provider text,
  paid_date date
);

-- Create User Settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_budget numeric NOT NULL DEFAULT 50000,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create Maintenance Tasks table
CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  category text,
  due_date date,
  is_completed boolean DEFAULT false,
  is_recurring boolean DEFAULT false,
  recurring_frequency text,
  notes text,
  last_completed_date date,
  created_at timestamp with time zone DEFAULT now()
);

-- Create Notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT ''::text,
  content text NOT NULL DEFAULT ''::text,
  color text NOT NULL DEFAULT 'yellow'::text,
  pinned boolean NOT NULL DEFAULT false,
  tag text NOT NULL DEFAULT 'Ideas'::text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Owner-based access)

-- Families
CREATE POLICY "Users can manage their own families" ON public.families
  FOR ALL TO authenticated USING (owner_id = auth.uid());

-- Documents
CREATE POLICY "Users can manage their own documents" ON public.documents
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- Subscriptions
CREATE POLICY "Users can manage their own subscriptions" ON public.subscriptions
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- Loans
CREATE POLICY "Users can manage their own loans" ON public.loans
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- Loan Payments
CREATE POLICY "Users can manage payments for their loans" ON public.loan_payments
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.loans WHERE loans.id = loan_payments.loan_id AND loans.user_id = auth.uid())
  );

-- Expenses
CREATE POLICY "Users can manage their own expenses" ON public.expenses
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- Bills
CREATE POLICY "Users can manage their own bills" ON public.bills
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- User Settings
CREATE POLICY "Users can manage their own settings" ON public.user_settings
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- Maintenance Tasks
CREATE POLICY "Users can manage their own maintenance tasks" ON public.maintenance_tasks
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- Notes
CREATE POLICY "Users can manage their own notes" ON public.notes
  FOR ALL TO authenticated USING (user_id = auth.uid());
