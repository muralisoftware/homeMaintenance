import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, X, CreditCard, Trash2, Loader2, Calendar, IndianRupee, Power, PowerOff, Edit2, Download, FileSpreadsheet,
} from 'lucide-react';
import Spinner from '../components/spinner';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';

const SUB_CATEGORIES = [
  'entertainment', 'music', 'video', 'fitness', 'cloud', 'software', 'news', 'other',
];

const subIcons: Record<string, string> = {
  entertainment: '🎬', music: '🎵', video: '📺', fitness: '💪',
  cloud: '☁️', software: '💻', news: '📰', other: '📌',
};

interface Subscription {
  id: string;
  name: string;
  provider: string;
  amount: number;
  billing_cycle: string;
  next_billing_date: string;
  category: string;
  is_active: boolean;
}

export function SubscriptionsPage() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    provider: '',
    amount: '',
    billing_cycle: 'monthly',
    next_billing_date: new Date().toISOString().split('T')[0],
    category: 'entertainment',
  });

  useEffect(() => {
    if (user) loadSubs();
  }, [user]);

  const loadSubs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user!.id)
      .order('next_billing_date', { ascending: true });
    setSubs(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const subData = {
      user_id: user!.id,
      service_name: form.name,
      provider: form.provider,
      amount: parseFloat(form.amount),
      billing_cycle: form.billing_cycle,
      next_billing_date: form.next_billing_date,
      category: form.category,
    };

    if (editingId) {
      await supabase.from('subscriptions').update(subData).eq('id', editingId);
      setEditingId(null);
    } else {
      await supabase.from('subscriptions').insert(subData);
    }

    setForm({ name: '', provider: '', amount: '', billing_cycle: 'monthly', next_billing_date: new Date().toISOString().split('T')[0], category: 'entertainment' });
    setShowForm(false);
    loadSubs();
  };

  const handleEdit = (sub: Subscription) => {
    setForm({
      name: sub.name,
      provider: sub.provider || '',
      amount: sub.amount.toString(),
      billing_cycle: sub.billing_cycle,
      next_billing_date: sub.next_billing_date,
      category: sub.category,
    });
    setEditingId(sub.id);
    setShowForm(true);
  };

  const handleExportPDF = () => {
    const headers = [['Name', 'Provider', 'Amount (₹)', 'Cycle', 'Next Date', 'Status']];
    const data = subs.map((s) => [
      s.name,
      s.provider || '-',
      s.amount.toLocaleString('en-IN'),
      s.billing_cycle,
      new Date(s.next_billing_date).toLocaleDateString('en-IN'),
      s.is_active ? 'Active' : 'Paused',
    ]);
    exportToPDF('Subscriptions Report', headers, data, 'subscriptions_report');
  };

  const handleExportExcel = () => {
    const data = subs.map((s) => ({
      Name: s.name,
      Provider: s.provider,
      Amount: s.amount,
      BillingCycle: s.billing_cycle,
      NextBillingDate: s.next_billing_date,
      Status: s.is_active ? 'Active' : 'Paused',
    }));
    exportToExcel(data, 'subscriptions_report');
  };

  const toggleActive = async (sub: Subscription) => {
    await supabase
      .from('subscriptions')
      .update({ is_active: !sub.is_active })
      .eq('id', sub.id);
    loadSubs();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('subscriptions').delete().eq('id', id);
    loadSubs();
  };

  const activeSubs = subs.filter((s) => s.is_active);
  const monthlyTotal = activeSubs.reduce((s, sub) => {
    if (sub.billing_cycle === 'monthly') return s + Number(sub.amount);
    if (sub.billing_cycle === 'quarterly') return s + Number(sub.amount) / 3;
    return s + Number(sub.amount) / 12;
  }, 0);
  const yearlyTotal = activeSubs.reduce((s, sub) => {
    if (sub.billing_cycle === 'monthly') return s + Number(sub.amount) * 12;
    if (sub.billing_cycle === 'quarterly') return s + Number(sub.amount) * 4;
    return s + Number(sub.amount);
  }, 0);

  if (loading) return <Spinner text="Loading your subscriptions..." />;
  
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-darkblue-900">Subscriptions</h2>
          <p className="text-sm text-darkblue-500 mt-0.5">Track recurring subscriptions and services</p>
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
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', provider: '', amount: '', billing_cycle: 'monthly', next_billing_date: new Date().toISOString().split('T')[0], category: 'entertainment' }); }}
            className="inline-flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Subscription
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-darkblue-200 p-4">
          <p className="text-xs text-darkblue-500 mb-1">Active Subscriptions</p>
          <p className="text-2xl font-bold text-darkblue-900">{activeSubs.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-darkblue-200 p-4">
          <p className="text-xs text-darkblue-500 mb-1">Monthly Cost</p>
          <p className="text-2xl font-bold text-gold-600">₹{Math.round(monthlyTotal).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-darkblue-200 p-4">
          <p className="text-xs text-darkblue-500 mb-1">Yearly Cost</p>
          <p className="text-2xl font-bold text-darkblue-900">₹{Math.round(yearlyTotal).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-darkblue-100">
              <h3 className="text-lg font-semibold text-darkblue-900">{editingId ? 'Edit Subscription' : 'Add Subscription'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-darkblue-100 text-darkblue-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="e.g., Netflix, Spotify"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Provider</label>
                <input
                  type="text"
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="e.g., Netflix Inc."
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
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-darkblue-700 mb-1">Billing Cycle</label>
                  <select
                    value={form.billing_cycle}
                    onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })}
                    className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-darkblue-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white"
                  >
                    {SUB_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{subIcons[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Next Billing Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-darkblue-400" />
                  <input
                    type="date"
                    value={form.next_billing_date}
                    onChange={(e) => setForm({ ...form, next_billing_date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-gold-600 hover:bg-gold-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {editingId ? 'Update Subscription' : 'Add Subscription'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      { subs.length === 0 ? (
        <div className="text-center py-16 text-darkblue-400">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No subscriptions tracked yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map((sub) => (
            <div
              key={sub.id}
              className={`bg-white rounded-xl border border-darkblue-200 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow ${
                !sub.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-darkblue-50 flex items-center justify-center text-lg">
                {subIcons[sub.category] || '📌'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-darkblue-900">{sub.name}</p>
                  {!sub.is_active && (
                    <span className="text-[10px] font-medium text-darkblue-400 bg-darkblue-100 px-1.5 py-0.5 rounded">PAUSED</span>
                  )}
                </div>
                <p className="text-xs text-darkblue-500">
                  {sub.provider || 'No provider'} · {sub.billing_cycle} · Next: {new Date(sub.next_billing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <p className="text-sm font-semibold text-darkblue-900">₹{Number(sub.amount).toLocaleString('en-IN')}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(sub)}
                  className="p-1.5 rounded-lg hover:bg-darkblue-100 text-darkblue-300 hover:text-gold-600 transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => toggleActive(sub)}
                  className={`p-1.5 rounded-lg hover:bg-darkblue-100 transition-colors ${
                    sub.is_active ? 'text-emerald-500 hover:text-darkblue-400' : 'text-darkblue-300 hover:text-emerald-500'
                  }`}
                  title={sub.is_active ? 'Pause' : 'Resume'}
                >
                  {sub.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDelete(sub.id)}
                  className="p-1.5 rounded-lg hover:bg-darkblue-100 text-darkblue-300 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
