import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, X, Bell, CheckCircle2, Clock, AlertTriangle,
  Trash2, Loader2, Calendar, IndianRupee, Repeat,
} from 'lucide-react';

const BILL_TYPES = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'water', label: 'Water Tax' },
  { value: 'internet', label: 'Internet/WiFi' },
  { value: 'gas', label: 'Gas Cylinder' },
  { value: 'rent', label: 'House Rent' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'school', label: 'School Fees' },
  { value: 'other', label: 'Other' },
];

const billIcons: Record<string, string> = {
  electricity: '⚡', water: '💧', internet: '📶', gas: '🔥',
  rent: '🏠', credit_card: '💳', insurance: '🛡️', school: '📚', other: '📄',
};

interface Bill {
  id: string;
  bill_type: string;
  provider: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  is_recurring: boolean;
  recurring_frequency: string;
  reminder_days_before: number;
  notes: string;
  paid_date: string | null;
}

export function BillsPage() {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [form, setForm] = useState({
    bill_type: 'electricity',
    provider: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    recurring_frequency: 'monthly',
    reminder_days_before: '3',
    notes: '',
  });

  useEffect(() => {
    if (user) loadBills();
  }, [user]);

  const loadBills = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', user!.id)
      .order('due_date', { ascending: true });
    setBills(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('bills').insert({
      user_id: user!.id,
      bill_type: form.bill_type,
      provider: form.provider,
      amount: parseFloat(form.amount) || 0,
      due_date: form.due_date,
      // is_recurring: form.is_recurring,
      // recurring_frequency: form.is_recurring ? form.recurring_frequency : '',
      reminder_days: parseInt(form.reminder_days_before) || 3,
      notes: form.notes,
    });
    setForm({
      bill_type: 'electricity', provider: '', amount: '',
      due_date: new Date().toISOString().split('T')[0],
      is_recurring: false, recurring_frequency: 'monthly',
      reminder_days_before: '3', notes: '',
    });
    setShowForm(false);
    loadBills();
  };

  const togglePaid = async (bill: Bill) => {
    const isPaid = !bill.is_paid;
    await supabase
      .from('bills')
      .update({
        is_paid: isPaid,
        paid_date: isPaid ? new Date().toISOString().split('T')[0] : null,
      })
      .eq('id', bill.id);
    loadBills();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('bills').delete().eq('id', id);
    loadBills();
  };

  const filtered = bills.filter((b) => {
    if (filter === 'unpaid') return !b.is_paid;
    if (filter === 'paid') return b.is_paid;
    return true;
  });

  const unpaidTotal = bills.filter((b) => !b.is_paid).reduce((s, b) => s + Number(b.amount), 0);
  const overdueCount = bills.filter((b) => !b.is_paid && new Date(b.due_date) < new Date()).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bill Reminders</h2>
          <p className="text-sm text-slate-500 mt-0.5">Never miss a payment deadline</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Bill
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{bills.filter((b) => !b.is_paid).length}</p>
              <p className="text-xs text-slate-500">Unpaid Bills</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{overdueCount}</p>
              <p className="text-xs text-slate-500">Overdue</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">₹{unpaidTotal.toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500">Total Due</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'unpaid', 'paid'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-semibold text-slate-900">Add Bill Reminder</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bill Type</label>
                <select
                  value={form.bill_type}
                  onChange={(e) => setForm({ ...form, bill_type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {BILL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{billIcons[t.value]} {t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Provider / Company</label>
                <input
                  type="text"
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., TNEB, Airtel, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_recurring}
                    onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
                <span className="text-sm text-slate-700 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5" /> Recurring bill
                </span>
              </div>
              {form.is_recurring && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
                  <select
                    value={form.recurring_frequency}
                    onChange={(e) => setForm({ ...form, recurring_frequency: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remind me (days before)</label>
                <input
                  type="number"
                  value={form.reminder_days_before}
                  onChange={(e) => setForm({ ...form, reminder_days_before: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  min="1"
                  max="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  rows={2}
                  placeholder="Any additional notes..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Add Bill Reminder
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bill List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No bills found. Add your first bill reminder!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bill) => {
            const daysLeft = Math.ceil(
              (new Date(bill.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            const isOverdue = daysLeft < 0 && !bill.is_paid;
            const isUrgent = daysLeft <= 3 && daysLeft >= 0 && !bill.is_paid;
            const typeLabel = BILL_TYPES.find((t) => t.value === bill.bill_type)?.label || bill.bill_type;

            return (
              <div
                key={bill.id}
                className={`bg-white rounded-xl border p-4 flex items-center gap-3 hover:shadow-sm transition-shadow ${
                  bill.is_paid
                    ? 'border-slate-100 opacity-70'
                    : isOverdue
                    ? 'border-red-200 bg-red-50/30'
                    : isUrgent
                    ? 'border-amber-200 bg-amber-50/30'
                    : 'border-slate-200'
                }`}
              >
                <button
                  onClick={() => togglePaid(bill)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    bill.is_paid
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-slate-300 hover:border-teal-400'
                  }`}
                >
                  {bill.is_paid && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg flex-shrink-0">
                  {billIcons[bill.bill_type] || '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{typeLabel}</p>
                    {bill.is_recurring && <Repeat className="w-3 h-3 text-slate-400" />}
                  </div>
                  <p className="text-xs text-slate-500">
                    {bill.provider || 'No provider'}
                    {' · '}
                    Due {new Date(bill.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {!bill.is_paid && (
                      <span className={`ml-1 ${isOverdue ? 'text-red-500 font-medium' : isUrgent ? 'text-amber-600 font-medium' : ''}`}>
                        {isOverdue ? '(Overdue!)' : isUrgent ? `(${daysLeft}d left)` : `(${daysLeft}d left)`}
                      </span>
                    )}
                    {bill.is_paid && bill.paid_date && (
                      <span className="text-emerald-500 ml-1"> · Paid {new Date(bill.paid_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    )}
                  </p>
                </div>
                <p className={`text-sm font-semibold ${bill.is_paid ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                  ₹{Number(bill.amount).toLocaleString('en-IN')}
                </p>
                <button
                  onClick={() => handleDelete(bill.id)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
