import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Filter, Trash2, CreditCard as Edit3, X, Loader2, Receipt, Calendar, IndianRupee } from 'lucide-react';
import Spinner from '../components/spinner';

const CATEGORIES = [
  'grocery', 'food', 'medical', 'fuel', 'education',
  'entertainment', 'shopping', 'transport', 'bills', 'rent', 'other',
];

const categoryEmojis: Record<string, string> = {
  grocery: '🛒', food: '🍽️', medical: '🏥', fuel: '⛽', education: '📚',
  entertainment: '🎬', shopping: '🛍️', transport: '🚌', bills: '📄', rent: '🏠', other: '📌',
};

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  expense_date: string;
  created_at: string;
}

export function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [form, setForm] = useState({
    amount: '',
    category: 'grocery',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (user) loadExpenses();
  }, [user]);

  const loadExpenses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user!.id)
      .order('expense_date', { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await supabase
        .from('expenses')
        .update({
          amount: parseFloat(form.amount),
          category: form.category,
          description: form.description,
          expense_date: form.expense_date,
        })
        .eq('id', editingId);
      setEditingId(null);
    } else {
      await supabase.from('expenses').insert({
        user_id: user!.id,
        amount: parseFloat(form.amount),
        category: form.category,
        description: form.description,
        expense_date: form.expense_date,
      });
    }
    setForm({ amount: '', category: 'grocery', description: '', expense_date: new Date().toISOString().split('T')[0] });
    setShowForm(false);
    loadExpenses();
  };

  const handleEdit = (expense: Expense) => {
    setForm({
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description,
      expense_date: expense.expense_date,
    });
    setEditingId(expense.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    loadExpenses();
  };

  const filtered = expenses.filter((e) => {
    const matchSearch = !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !filterCategory || e.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0);

  // Group by date
  const grouped: Record<string, Expense[]> = {};
  filtered.forEach((e) => {
    const key = e.expense_date;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  if (loading) {
    return (
      <Spinner text="Loading your expenses..." />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Expenses</h2>
          <p className="text-sm text-slate-500 mt-0.5">Track your daily spending</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ amount: '', category: 'grocery', description: '', expense_date: new Date().toISOString().split('T')[0] }); }}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white appearance-none"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{categoryEmojis[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Total */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
        <span className="text-sm text-slate-500">Total ({filtered.length} expenses)</span>
        <span className="text-lg font-bold text-slate-900">₹{totalFiltered.toLocaleString('en-IN')}</span>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Expense' : 'Add Expense'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{categoryEmojis[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="What did you spend on?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {editingId ? 'Update Expense' : 'Add Expense'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Expense List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No expenses found. Start tracking your spending!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs font-medium text-slate-500">
                  ₹{items.reduce((s, e) => s + Number(e.amount), 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((expense) => (
                  <div
                    key={expense.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg">
                      {categoryEmojis[expense.category] || '📌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {expense.description || expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                      </p>
                      <p className="text-xs text-slate-400 capitalize">{expense.category}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">₹{Number(expense.amount).toLocaleString('en-IN')}</p>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-teal-600"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
