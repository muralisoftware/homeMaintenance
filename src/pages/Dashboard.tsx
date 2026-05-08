import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  Bell,
  CreditCard,
  Receipt,
  Landmark,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  IndianRupee,
} from 'lucide-react';

interface ExpenseSummary {
  total: number;
  byCategory: { category: string; total: number }[];
}

interface BillItem {
  id: string;
  bill_type: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  provider: string;
}

interface SubscriptionItem {
  id: string;
  name: string;
  amount: number;
  billing_cycle: string;
  next_billing_date: string;
  is_active: boolean;
}

interface LoanItem {
  id: string;
  loan_type: string;
  outstanding_balance: number;
  emi_amount: number;
  emi_due_date: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary>({ total: 0, byCategory: [] });
  const [upcomingBills, setUpcomingBills] = useState<BillItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [monthlyBudget] = useState(50000);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [expensesRes, billsRes, subsRes, loansRes] = await Promise.all([
      supabase
        .from('expenses')
        .select('amount, category')
        .eq('user_id', user!.id)
        .gte('expense_date', startOfMonth)
        .lte('expense_date', endOfMonth),
      supabase
        .from('bills')
        .select('id, bill_type, amount, due_date, is_paid, provider')
        .eq('user_id', user!.id)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(5),
      supabase
        .from('subscriptions')
        .select('id, name, amount, billing_cycle, next_billing_date, is_active')
        .eq('user_id', user!.id)
        .eq('is_active', true),
      supabase
        .from('loans')
        .select('id, loan_type, outstanding_balance, emi_amount, emi_due_date')
        .eq('user_id', user!.id)
        .eq('is_active', true),
    ]);

    const expenses = expensesRes.data || [];
    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const categoryMap: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + Number(e.amount);
    });
    const byCategory = Object.entries(categoryMap)
      .map(([category, catTotal]) => ({ category, total: catTotal }))
      .sort((a, b) => b.total - a.total);

    setExpenseSummary({ total, byCategory });
    setUpcomingBills(billsRes.data || []);
    setSubscriptions(subsRes.data || []);
    setLoans(loansRes.data || []);
    setLoading(false);
  };

  const totalSubscriptions = subscriptions.reduce((s, sub) => s + Number(sub.amount), 0);
  const totalEMI = loans.reduce((s, l) => s + Number(l.emi_amount), 0);
  const savings = monthlyBudget - expenseSummary.total;
  const savingsPercent = Math.max(0, Math.min(100, (savings / monthlyBudget) * 100));

  const categoryColors: Record<string, string> = {
    grocery: '#0d9488',
    food: '#f59e0b',
    medical: '#ef4444',
    fuel: '#6366f1',
    education: '#8b5cf6',
    entertainment: '#ec4899',
    shopping: '#14b8a6',
    transport: '#f97316',
    bills: '#3b82f6',
    rent: '#64748b',
    other: '#94a3b8',
  };

  const billTypeLabels: Record<string, string> = {
    electricity: 'Electricity',
    water: 'Water Tax',
    internet: 'Internet/WiFi',
    gas: 'Gas Cylinder',
    rent: 'House Rent',
    credit_card: 'Credit Card',
    insurance: 'Insurance',
    school: 'School Fees',
    other: 'Other Bill',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Expenses"
          value={`₹${expenseSummary.total.toLocaleString('en-IN')}`}
          subtitle="This month"
          icon={Receipt}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
          trend={expenseSummary.total > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          title="Upcoming Bills"
          value={upcomingBills.filter((b) => !b.is_paid).length.toString()}
          subtitle={`${upcomingBills.filter((b) => !b.is_paid).reduce((s, b) => s + Number(b.amount), 0).toLocaleString('en-IN')} due`}
          icon={Bell}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          trend="neutral"
        />
        <StatCard
          title="Subscriptions"
          value={`₹${totalSubscriptions.toLocaleString('en-IN')}`}
          subtitle={`${subscriptions.length} active`}
          icon={CreditCard}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          trend="neutral"
        />
        <StatCard
          title="EMI Due"
          value={`₹${totalEMI.toLocaleString('en-IN')}`}
          subtitle={`${loans.length} active loans`}
          icon={Landmark}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          trend="neutral"
        />
      </div>

      {/* Savings Progress */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Monthly Savings</h3>
            <p className="text-sm text-slate-500">Budget: ₹{monthlyBudget.toLocaleString('en-IN')}</p>
          </div>
          <div className={`text-2xl font-bold ${savings >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {savings >= 0 ? '+' : ''}₹{Math.abs(savings).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${savings >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
            style={{ width: `${savingsPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>₹0</span>
          <span>₹{monthlyBudget.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Expense Breakdown</h3>
          {expenseSummary.byCategory.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No expenses this month</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenseSummary.byCategory.map((cat) => {
                const percent = (cat.total / expenseSummary.total) * 100;
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 capitalize">{cat.category}</span>
                      <span className="text-sm text-slate-500">₹{cat.total.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: categoryColors[cat.category] || '#94a3b8',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Bills */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Upcoming Bills</h3>
          {upcomingBills.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">All bills are paid!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBills.map((bill) => {
                const daysLeft = Math.ceil(
                  (new Date(bill.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                const isUrgent = daysLeft <= 3;
                return (
                  <div
                    key={bill.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      isUrgent ? 'border-red-200 bg-red-50/50' : 'border-slate-100 bg-slate-50/50'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isUrgent ? 'bg-red-100' : 'bg-slate-100'
                      }`}
                    >
                      {isUrgent ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {billTypeLabels[bill.bill_type] || bill.bill_type}
                      </p>
                      <p className="text-xs text-slate-500">
                        {bill.provider || 'No provider'} · Due {new Date(bill.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">₹{Number(bill.amount).toLocaleString('en-IN')}</p>
                      <p className={`text-xs ${isUrgent ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                        {daysLeft <= 0 ? 'Overdue!' : `${daysLeft}d left`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active Subscriptions & Loans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Active Subscriptions</h3>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
              ₹{totalSubscriptions.toLocaleString('en-IN')}/mo
            </span>
          </div>
          {subscriptions.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No active subscriptions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{sub.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{sub.billing_cycle}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">₹{Number(sub.amount).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Active Loans</h3>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
              EMI ₹{totalEMI.toLocaleString('en-IN')}/mo
            </span>
          </div>
          {loans.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <Landmark className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No active loans</p>
            </div>
          ) : (
            <div className="space-y-2">
              {loans.map((loan) => (
                <div key={loan.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900 capitalize">{loan.loan_type} Loan</p>
                    <p className="text-xs text-slate-400">Outstanding: ₹{Number(loan.outstanding_balance).toLocaleString('en-IN')}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">₹{Number(loan.emi_amount).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Receipt;
  iconBg: string;
  iconColor: string;
  trend: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-red-400" />}
        {trend === 'down' && <TrendingDown className="w-4 h-4 text-emerald-400" />}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mt-2">{title}</p>
    </div>
  );
}
