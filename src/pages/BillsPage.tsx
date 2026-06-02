import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, X, Bell, CheckCircle2, Clock, AlertTriangle,
  Trash2, Loader2, Calendar, IndianRupee, Repeat, Edit2, Download, FileSpreadsheet,
} from 'lucide-react';
import Spinner from '../components/spinner';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';

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
  const [editingId, setEditingId] = useState<string | null>(null);
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
    const billData = {
      user_id: user!.id,
      bill_type: form.bill_type,
      provider: form.provider,
      amount: parseFloat(form.amount) || 0,
      due_date: form.due_date,
      // is_recurring: form.is_recurring,
      // recurring_frequency: form.is_recurring ? form.recurring_frequency : '',
      reminder_days: parseInt(form.reminder_days_before) || 3,
      notes: form.notes,
    };

    if (editingId) {
      await supabase.from('bills').update(billData).eq('id', editingId);
      setEditingId(null);
    } else {
      await supabase.from('bills').insert(billData);
    }

    setForm({
      bill_type: 'electricity', provider: '', amount: '',
      due_date: new Date().toISOString().split('T')[0],
      is_recurring: false, recurring_frequency: 'monthly',
      reminder_days_before: '3', notes: '',
    });
    setShowForm(false);
    loadBills();
  };

  const handleEdit = (bill: Bill) => {
    setForm({
      bill_type: bill.bill_type,
      provider: bill.provider || '',
      amount: bill.amount.toString(),
      due_date: bill.due_date,
      is_recurring: bill.is_recurring || false,
      recurring_frequency: bill.recurring_frequency || 'monthly',
      reminder_days_before: (bill.reminder_days_before || 3).toString(),
      notes: bill.notes || '',
    });
    setEditingId(bill.id);
    setShowForm(true);
  };

  const handleExportPDF = () => {
    const headers = [['Due Date', 'Type', 'Provider', 'Amount (₹)', 'Status']];
    const data = filtered.map((b) => [
      new Date(b.due_date).toLocaleDateString('en-IN'),
      BILL_TYPES.find((t) => t.value === b.bill_type)?.label || b.bill_type,
      b.provider || '-',
      b.amount.toLocaleString('en-IN'),
      b.is_paid ? 'Paid' : 'Unpaid',
    ]);
    exportToPDF('Bill Reminders Report', headers, data, 'bills_report');
  };

  const handleExportExcel = () => {
    const data = filtered.map((b) => ({
      DueDate: b.due_date,
      Type: BILL_TYPES.find((t) => t.value === b.bill_type)?.label || b.bill_type,
      Provider: b.provider,
      Amount: b.amount,
      Status: b.is_paid ? 'Paid' : 'Unpaid',
    }));
    exportToExcel(data, 'bills_report');
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

  if (loading) return <Spinner text="Loading your bills..." />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-darkblue-900">Bill Reminders</h2>
          <p className="text-sm text-darkblue-500 mt-0.5">Never miss a payment deadline</p>
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
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ bill_type: 'electricity', provider: '', amount: '', due_date: new Date().toISOString().split('T')[0], is_recurring: false, recurring_frequency: 'monthly', reminder_days_before: '3', notes: '' }); }}
            className="inline-flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Bill
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-darkblue-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-darkblue-900">{bills.filter((b) => !b.is_paid).length}</p>
              <p className="text-xs text-darkblue-500">Unpaid Bills</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-darkblue-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-darkblue-900">{overdueCount}</p>
              <p className="text-xs text-darkblue-500">Overdue</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-darkblue-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-50 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-gold-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-darkblue-900">₹{unpaidTotal.toLocaleString('en-IN')}</p>
              <p className="text-xs text-darkblue-500">Total Due</p>
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
                ? 'bg-gold-50 text-gold-700 border border-gold-200'
                : 'bg-white text-darkblue-500 border border-darkblue-200 hover:bg-darkblue-50'
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
            <div className="flex items-center justify-between p-5 border-b border-darkblue-100 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-semibold text-darkblue-900">{editingId ? 'Edit Bill Reminder' : 'Add Bill Reminder'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-darkblue-100 text-darkblue-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Bill Type</label>
                <select
                  value={form.bill_type}
                  onChange={(e) => setForm({ ...form, bill_type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white"
                >
                  {BILL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{billIcons[t.value]} {t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Provider / Company</label>
                <input
                  type="text"
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="e.g., TNEB, Airtel, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Amount (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-darkblue-400" />
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Due Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-darkblue-400" />
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
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
                  <div className="w-9 h-5 bg-darkblue-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-600"></div>
                </label>
                <span className="text-sm text-darkblue-700 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5" /> Recurring bill
                </span>
              </div>
              {form.is_recurring && (
                <div>
                  <label className="block text-sm font-medium text-darkblue-700 mb-1">Frequency</label>
                  <select
                    value={form.recurring_frequency}
                    onChange={(e) => setForm({ ...form, recurring_frequency: e.target.value })}
                    className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Remind me (days before)</label>
                <input
                  type="number"
                  value={form.reminder_days_before}
                  onChange={(e) => setForm({ ...form, reminder_days_before: e.target.value })}
                  className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  min="1"
                  max="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 resize-none"
                  rows={2}
                  placeholder="Any additional notes..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gold-600 hover:bg-gold-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {editingId ? 'Update Bill Reminder' : 'Add Bill Reminder'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bill List */}
      { filtered.length === 0 ? (
        <div className="text-center py-16 text-darkblue-400">
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
                    ? 'border-darkblue-100 opacity-70'
                    : isOverdue
                    ? 'border-red-200 bg-red-50/30'
                    : isUrgent
                    ? 'border-amber-200 bg-amber-50/30'
                    : 'border-darkblue-200'
                }`}
              >
                <button
                  onClick={() => togglePaid(bill)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    bill.is_paid
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-darkblue-300 hover:border-gold-400'
                  }`}
                >
                  {bill.is_paid && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
                <div className="w-10 h-10 rounded-xl bg-darkblue-50 flex items-center justify-center text-lg flex-shrink-0">
                  {billIcons[bill.bill_type] || '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-darkblue-900">{typeLabel}</p>
                    {bill.is_recurring && <Repeat className="w-3 h-3 text-darkblue-400" />}
                  </div>
                  <p className="text-xs text-darkblue-500">
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
                <p className={`text-sm font-semibold ${bill.is_paid ? 'text-darkblue-400 line-through' : 'text-darkblue-900'}`}>
                  ₹{Number(bill.amount).toLocaleString('en-IN')}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(bill)}
                    className="p-1.5 rounded-lg hover:bg-darkblue-100 text-darkblue-300 hover:text-gold-600 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(bill.id)}
                    className="p-1.5 rounded-lg hover:bg-darkblue-100 text-darkblue-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
