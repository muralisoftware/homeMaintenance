import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {Plus, X, Landmark, Trash2, IndianRupee, Calendar, TrendingDown, Edit2, Download, FileSpreadsheet,} from 'lucide-react';
import Spinner from '../components/spinner';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';
import { DataTable, Column } from '../components/DataTable';

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
  const [editingId, setEditingId] = useState<string | null>(null);
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
    const loanData = {
      user_id: user!.id,
      loan_type: form.loan_type,
      bank_name: form.lender_name,
      principal_amount: parseFloat(form.principal_amount) || 0,
      outstanding_balance: parseFloat(form.outstanding_balance) || 0,
      interest_rate: parseFloat(form.interest_rate) || 0,
      emi_amount: parseFloat(form.emi_amount) || 0,
      emi_due_date: form.emi_due_date,
      tenure_months: parseInt(form.tenure_months) || 0,
      start_date: form.start_date,
    };

    if (editingId) {
      await supabase.from('loans').update(loanData).eq('id', editingId);
      setEditingId(null);
    } else {
      await supabase.from('loans').insert(loanData);
    }

    setForm({
      loan_type: 'personal', lender_name: '', principal_amount: '',
      outstanding_balance: '', interest_rate: '', emi_amount: '',
      emi_due_date: '', tenure_months: '', start_date: new Date().toISOString().split('T')[0],
    });
    setShowForm(false);
    loadLoans();
  };

  const handleEdit = (loan: Loan) => {
    setForm({
      loan_type: loan.loan_type,
      lender_name: (loan as any).bank_name || '', // bank_name in DB
      principal_amount: loan.principal_amount.toString(),
      outstanding_balance: loan.outstanding_balance.toString(),
      interest_rate: loan.interest_rate.toString(),
      emi_amount: loan.emi_amount.toString(),
      emi_due_date: loan.emi_due_date || '',
      tenure_months: loan.tenure_months.toString(),
      start_date: loan.start_date,
    });
    setEditingId(loan.id);
    setShowForm(true);
  };

  const handleExportPDF = () => {
    const headers = [['Type', 'Lender', 'Principal', 'Outstanding', 'EMI', 'Progress']];
    const data = loans.map((l) => {
      const progress = l.principal_amount > 0
        ? Math.round(((Number(l.principal_amount) - Number(l.outstanding_balance)) / Number(l.principal_amount)) * 100)
        : 0;
      return [
        LOAN_TYPES.find((t) => t.value === l.loan_type)?.label || l.loan_type,
        (l as any).bank_name || '-',
        l.principal_amount.toLocaleString('en-IN'),
        l.outstanding_balance.toLocaleString('en-IN'),
        l.emi_amount.toLocaleString('en-IN'),
        `${progress}%`,
      ];
    });
    exportToPDF('Loans Report', headers, data, 'loans_report');
  };

  const handleExportExcel = () => {
    const data = loans.map((l) => ({
      Type: LOAN_TYPES.find((t) => t.value === l.loan_type)?.label || l.loan_type,
      Lender: (l as any).bank_name,
      Principal: l.principal_amount,
      Outstanding: l.outstanding_balance,
      EMI: l.emi_amount,
      StartDate: l.start_date,
    }));
    exportToExcel(data, 'loans_report');
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

  const columns: Column<Loan>[] = [
    {
      header: 'Lender / Bank',
      key: 'bank_name',
      sortable: true,
      render: (loan) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-darkblue-50 flex items-center justify-center text-sm">
            {loanIcons[loan.loan_type] || '🏦'}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-darkblue-900">{(loan as any).bank_name || 'No lender'}</span>
            <span className="text-xs text-darkblue-400">{LOAN_TYPES.find(t => t.value === loan.loan_type)?.label}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Principal',
      key: 'principal_amount',
      sortable: true,
      align: 'right',
      render: (loan) => (
        <span className="text-sm font-medium text-darkblue-700">₹{Number(loan.principal_amount).toLocaleString('en-IN')}</span>
      ),
    },
    {
      header: 'Outstanding Balance',
      key: 'outstanding_balance',
      sortable: true,
      render: (loan) => {
        const progress = loan.principal_amount > 0
          ? ((Number(loan.principal_amount) - Number(loan.outstanding_balance)) / Number(loan.principal_amount)) * 100
          : 0;
        return (
          <div className="flex flex-col min-w-[120px]">
            <div className="flex justify-between mb-1">
              <span className="text-xs font-bold text-rose-600">₹{Number(loan.outstanding_balance).toLocaleString('en-IN')}</span>
              <span className="text-[10px] font-medium text-darkblue-400">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-darkblue-50 rounded-full overflow-hidden">
              <div className="h-full bg-gold-500 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Monthly EMI',
      key: 'emi_amount',
      sortable: true,
      align: 'right',
      render: (loan) => (
        <div className="flex flex-col items-end">
          <span className="text-sm font-bold text-darkblue-900">₹{Number(loan.emi_amount).toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-darkblue-400">Due: {loan.emi_due_date || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Payments',
      key: 'id',
      align: 'center',
      render: (loan) => (
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setShowPaymentForm(loan.id)}
            className="text-[10px] font-bold bg-gold-50 text-gold-700 px-2 py-1 rounded hover:bg-gold-100 uppercase tracking-wider"
          >
            Pay EMI
          </button>
          <button
            onClick={() => setSelectedLoan(selectedLoan === loan.id ? null : loan.id)}
            className="text-[10px] font-medium text-darkblue-400 hover:text-gold-600 underline"
          >
            History
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <Spinner text="Loading your loans..." />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-darkblue-900">EMI & Loans</h2>
          <p className="text-sm text-darkblue-500 mt-0.5">Track your loans and EMI payments</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-darkblue-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={handleExportPDF}
              className="p-2 hover:bg-darkblue-50 text-darkblue-600 transition-colors rounded-lg flex items-center gap-2 text-xs font-medium"
              title="Download PDF"
            >
              <Download className="w-4 h-4 text-rose-500" />
              PDF
            </button>
            <div className="w-px h-4 bg-darkblue-200 mx-1" />
            <button
              onClick={handleExportExcel}
              className="p-2 hover:bg-darkblue-50 text-darkblue-600 transition-colors rounded-lg flex items-center gap-2 text-xs font-medium"
              title="Download Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              Excel
            </button>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ loan_type: 'personal', lender_name: '', principal_amount: '', outstanding_balance: '', interest_rate: '', emi_amount: '', emi_due_date: '', tenure_months: '', start_date: new Date().toISOString().split('T')[0] }); }}
            className="inline-flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Loan
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-darkblue-200 p-4">
          <p className="text-xs text-darkblue-500 mb-1">Active Loans</p>
          <p className="text-2xl font-bold text-darkblue-900">{loans.filter((l) => l.is_active).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-darkblue-200 p-4">
          <p className="text-xs text-darkblue-500 mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-rose-600">₹{totalOutstanding.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-darkblue-200 p-4">
          <p className="text-xs text-darkblue-500 mb-1">Monthly EMI</p>
          <p className="text-2xl font-bold text-darkblue-900">₹{totalEMI.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Add Loan Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-darkblue-100 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-semibold text-darkblue-900">{editingId ? 'Edit Loan' : 'Add Loan'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-darkblue-100 text-darkblue-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Loan Type</label>
                <select
                  value={form.loan_type}
                  onChange={(e) => setForm({ ...form, loan_type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white"
                >
                  {LOAN_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{loanIcons[t.value]} {t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Lender / Bank Name</label>
                <input
                  type="text"
                  value={form.lender_name}
                  onChange={(e) => setForm({ ...form, lender_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="e.g., SBI, HDFC"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-darkblue-700 mb-1">Principal (₹)</label>
                  <input
                    type="number"
                    value={form.principal_amount}
                    onChange={(e) => setForm({ ...form, principal_amount: e.target.value })}
                    className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-darkblue-700 mb-1">Outstanding (₹)</label>
                  <input
                    type="number"
                    value={form.outstanding_balance}
                    onChange={(e) => setForm({ ...form, outstanding_balance: e.target.value })}
                    className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-darkblue-700 mb-1">EMI Amount (₹)</label>
                  <input
                    type="number"
                    value={form.emi_amount}
                    onChange={(e) => setForm({ ...form, emi_amount: e.target.value })}
                    className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-darkblue-700 mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    value={form.interest_rate}
                    onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-darkblue-700 mb-1">EMI Due Date</label>
                  <input
                    type="text"
                    value={form.emi_due_date}
                    onChange={(e) => setForm({ ...form, emi_due_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="e.g., 5th of every month"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-darkblue-700 mb-1">Tenure (months)</label>
                  <input
                    type="number"
                    value={form.tenure_months}
                    onChange={(e) => setForm({ ...form, tenure_months: e.target.value })}
                    className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-darkblue-400" />
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-gold-600 hover:bg-gold-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {editingId ? 'Update Loan' : 'Add Loan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentForm(null)}>
          <div className="bg-white rounded-2xl w-full max-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-darkblue-100">
              <h3 className="text-lg font-semibold text-darkblue-900">Record EMI Payment</h3>
              <button onClick={() => setShowPaymentForm(null)} className="p-1.5 rounded-lg hover:bg-darkblue-100 text-darkblue-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePayment} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Amount (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-darkblue-400" />
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0"
                    required
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Optional notes"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gold-600 hover:bg-gold-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Record Payment
              </button>
            </form>
          </div>
        </div>
      )}

      <DataTable
        data={loans}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No loans tracked yet"
        emptyIcon={Landmark}
      />

      {selectedLoan && loanPayments.length > 0 && (
        <div className="mt-8 bg-white rounded-2xl border border-darkblue-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-darkblue-100 flex items-center justify-between bg-darkblue-50/50">
            <h3 className="text-sm font-bold text-darkblue-900 uppercase tracking-wider">
              Payment History: {loans.find(l => l.id === selectedLoan)?.bank_name || 'Selected Loan'}
            </h3>
            <button onClick={() => setSelectedLoan(null)} className="text-xs text-darkblue-500 hover:text-darkblue-700">Close</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white border-b border-darkblue-100">
                  <th className="px-6 py-3 text-[10px] font-bold text-darkblue-400 uppercase">Date</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-darkblue-400 uppercase">Notes</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-darkblue-400 uppercase text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-darkblue-100">
                {loanPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-3 text-sm text-darkblue-900">
                      {new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-3 text-sm text-darkblue-500">{p.notes || '-'}</td>
                    <td className="px-6 py-3 text-sm font-bold text-darkblue-900 text-right">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
