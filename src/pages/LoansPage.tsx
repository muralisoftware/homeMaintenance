import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, X, Landmark, Trash2, Loader2, IndianRupee, Calendar, TrendingDown,
} from 'lucide-react';
import Spinner from '../components/spinner';

const LOAN_TYPES = [
  { value: 'home', label: 'Home Loan' },
  { value: 'bike', label: 'Bike Loan' },
  { value: 'car', label: 'Car Loan' },
  { value: 'personal', label: 'Personal Loan' },
  { value: 'education', label: 'Education Loan' },
  { value: 'gold', label: 'Gold Loan' },
  { value: 'other', label: 'Other' },
];

const loanIcons: Record<string, string> = {
  home: '🏠', bike: '🏍️', car: '🚗', personal: '👤',
  education: '🎓', gold: '🥇', other: '🏦',
};

interface Loan {
  id: string;
  loan_type: string;
  lender_name: string;
  principal_amount: number;
  outstanding_balance: number;
  interest_rate: number;
  emi_amount: number;
  emi_due_date: string;
  tenure_months: number;
  paid_months: number;
  start_date: string;
  is_active: boolean;
}

interface LoanPayment {
  id: string;
  loan_id: string;
  amount: number;
  payment_date: string;
  notes: string;
}

export function LoansPage() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<string | null>(null);
  const [form, setForm] = useState({
    loan_type: 'personal',
    lender_name: '',
    principal_amount: '',
    outstanding_balance: '',
    interest_rate: '',
    emi_amount: '',
    emi_due_date: '',
    tenure_months: '',
    start_date: new Date().toISOString().split('T')[0],
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (user) loadLoans();
  }, [user]);

  const loadLoans = async () => {
    setLoading(true);
    const [loansRes, paymentsRes] = await Promise.all([
      supabase.from('loans').select('*').eq('user_id', user!.id).order('start_date', { ascending: false }),
      supabase.from('loan_payments').select('*').order('payment_date', { ascending: false }),
    ]);
    setLoans(loansRes.data || []);
    setPayments(paymentsRes.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('loans').insert({
      user_id: user!.id,
      loan_type: form.loan_type,
      lender_name: form.lender_name,
      principal_amount: parseFloat(form.principal_amount) || 0,
      outstanding_balance: parseFloat(form.outstanding_balance) || 0,
      interest_rate: parseFloat(form.interest_rate) || 0,
      emi_amount: parseFloat(form.emi_amount) || 0,
      emi_due_date: form.emi_due_date,
      tenure_months: parseInt(form.tenure_months) || 0,
      start_date: form.start_date,
    });
    setForm({
      loan_type: 'personal', lender_name: '', principal_amount: '',
      outstanding_balance: '', interest_rate: '', emi_amount: '',
      emi_due_date: '', tenure_months: '', start_date: new Date().toISOString().split('T')[0],
    });
    setShowForm(false);
    loadLoans();
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentForm) return;
    const loan = loans.find((l) => l.id === showPaymentForm);
    await supabase.from('loan_payments').insert({
      loan_id: showPaymentForm,
      amount: parseFloat(paymentForm.amount),
      payment_date: paymentForm.payment_date,
      notes: paymentForm.notes,
    });
    if (loan) {
      await supabase
        .from('loans')
        .update({
          outstanding_balance: Math.max(0, Number(loan.outstanding_balance) - parseFloat(paymentForm.amount)),
          paid_months: loan.paid_months + 1,
        })
        .eq('id', showPaymentForm);
    }
    setShowPaymentForm(null);
    setPaymentForm({ amount: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });
    loadLoans();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('loans').delete().eq('id', id);
    loadLoans();
  };

  const totalOutstanding = loans.filter((l) => l.is_active).reduce((s, l) => s + Number(l.outstanding_balance), 0);
  const totalEMI = loans.filter((l) => l.is_active).reduce((s, l) => s + Number(l.emi_amount), 0);

  const loanPayments = selectedLoan ? payments.filter((p) => p.loan_id === selectedLoan) : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">EMI & Loans</h2>
          <p className="text-sm text-slate-500 mt-0.5">Track your loans and EMI payments</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Loan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Active Loans</p>
          <p className="text-2xl font-bold text-slate-900">{loans.filter((l) => l.is_active).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-rose-600">₹{totalOutstanding.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Monthly EMI</p>
          <p className="text-2xl font-bold text-slate-900">₹{totalEMI.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Add Loan Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-semibold text-slate-900">Add Loan</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Loan Type</label>
                <select
                  value={form.loan_type}
                  onChange={(e) => setForm({ ...form, loan_type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {LOAN_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{loanIcons[t.value]} {t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lender / Bank Name</label>
                <input
                  type="text"
                  value={form.lender_name}
                  onChange={(e) => setForm({ ...form, lender_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., SBI, HDFC"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Principal (₹)</label>
                  <input
                    type="number"
                    value={form.principal_amount}
                    onChange={(e) => setForm({ ...form, principal_amount: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Outstanding (₹)</label>
                  <input
                    type="number"
                    value={form.outstanding_balance}
                    onChange={(e) => setForm({ ...form, outstanding_balance: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">EMI Amount (₹)</label>
                  <input
                    type="number"
                    value={form.emi_amount}
                    onChange={(e) => setForm({ ...form, emi_amount: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    value={form.interest_rate}
                    onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="0"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">EMI Due Date</label>
                  <input
                    type="text"
                    value={form.emi_due_date}
                    onChange={(e) => setForm({ ...form, emi_due_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g., 5th of every month"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tenure (months)</label>
                  <input
                    type="number"
                    value={form.tenure_months}
                    onChange={(e) => setForm({ ...form, tenure_months: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Add Loan
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentForm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Record EMI Payment</h3>
              <button onClick={() => setShowPaymentForm(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePayment} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="0"
                    required
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Optional notes"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Record Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Loan List */}
      {loading ? (
        <Spinner  text="Loading your loans..." />
      ) : loans.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Landmark className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No loans tracked yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => {
            const typeLabel = LOAN_TYPES.find((t) => t.value === loan.loan_type)?.label || loan.loan_type;
            const progress = loan.principal_amount > 0
              ? ((Number(loan.principal_amount) - Number(loan.outstanding_balance)) / Number(loan.principal_amount)) * 100
              : 0;
            const isSelected = selectedLoan === loan.id;

            return (
              <div key={loan.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-xl">
                      {loanIcons[loan.loan_type] || '🏦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{typeLabel}</p>
                          <p className="text-xs text-slate-500">{loan.lender_name || 'No lender'} · EMI due: {loan.emi_due_date || 'Not set'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowPaymentForm(loan.id)}
                            className="text-xs font-medium bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors"
                          >
                            Pay EMI
                          </button>
                          <button
                            onClick={() => handleDelete(loan.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-slate-400">Principal</p>
                      <p className="text-sm font-semibold text-slate-700">₹{Number(loan.principal_amount).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Outstanding</p>
                      <p className="text-sm font-semibold text-rose-600">₹{Number(loan.outstanding_balance).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">EMI</p>
                      <p className="text-sm font-semibold text-slate-700">₹{Number(loan.emi_amount).toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">Paid off</span>
                      <span className="text-xs font-medium text-teal-600">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {loan.tenure_months > 0 && (
                    <p className="text-xs text-slate-400 mt-2">
                      {loan.paid_months || 0} of {loan.tenure_months} EMIs paid
                      {loan.interest_rate > 0 && ` · ${loan.interest_rate}% interest`}
                    </p>
                  )}

                  {/* Toggle payment history */}
                  <button
                    onClick={() => setSelectedLoan(isSelected ? null : loan.id)}
                    className="mt-3 text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                  >
                    <TrendingDown className="w-3 h-3" />
                    {isSelected ? 'Hide' : 'View'} payment history
                  </button>
                </div>

                {isSelected && loanPayments.length > 0 && (
                  <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50">
                    <p className="text-xs font-medium text-slate-500 mb-2">Payment History</p>
                    <div className="space-y-2">
                      {loanPayments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">
                            {new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {p.notes && <span className="text-slate-400 ml-2">· {p.notes}</span>}
                          </span>
                          <span className="font-medium text-slate-900">₹{Number(p.amount).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
