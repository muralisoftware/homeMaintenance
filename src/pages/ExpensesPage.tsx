import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Filter, Trash2, CreditCard as Edit3, X, Loader2, Receipt, Calendar, IndianRupee, Download, FileSpreadsheet } from 'lucide-react';
import Spinner from '../components/spinner';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';
import { DataTable, Column } from '../components/DataTable';

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
  const [timeFilter, setTimeFilter] = useState('all');

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

  const handleExportPDF = () => {
    const headers = [['Date', 'Category', 'Description', 'Amount (₹)']];
    const data = filtered.map((e) => [
      new Date(e.expense_date).toLocaleDateString('en-IN'),
      e.category,
      e.description || '-',
      e.amount.toLocaleString('en-IN'),
    ]);
    exportToPDF('Expense Report', headers, data, 'expenses_report');
  };

  const handleExportExcel = () => {
    const data = filtered.map((e) => ({
      Date: e.expense_date,
      Category: e.category,
      Description: e.description,
      Amount: e.amount,
    }));
    exportToExcel(data, 'expenses_report');
  };

  const filtered = expenses.filter((e) => {
    const matchSearch = !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !filterCategory || e.category === filterCategory;
    
    // Time filter logic
    const expenseDate = new Date(e.expense_date);
    const now = new Date();
    let matchTime = true;

    if (timeFilter === 'today') {
      matchTime = expenseDate.toDateString() === now.toDateString();
    } else if (timeFilter === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      matchTime = expenseDate >= startOfWeek;
    } else if (timeFilter === 'month') {
      matchTime = expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
    } else if (timeFilter === 'year') {
      matchTime = expenseDate.getFullYear() === now.getFullYear();
    }

    return matchSearch && matchCategory && matchTime;
  });

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0);

  const columns: Column<Expense>[] = [
    {
      header: 'Date',
      key: 'expense_date',
      sortable: true,
      render: (e) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-darkblue-900">
            {new Date(e.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <span className="text-[10px] text-darkblue-400 uppercase font-medium">
            {new Date(e.expense_date).toLocaleDateString('en-IN', { weekday: 'short' })}
          </span>
        </div>
      ),
    },
    {
      header: 'Category',
      key: 'category',
      sortable: true,
      render: (e) => (
        <div className="flex items-center gap-2">
          <span className="text-lg">{categoryEmojis[e.category] || '📌'}</span>
          <span className="text-sm text-darkblue-700 capitalize">{e.category}</span>
        </div>
      ),
    },
    {
      header: 'Description',
      key: 'description',
      sortable: true,
      render: (e) => (
        <p className="text-sm text-darkblue-900 max-w-[200px] truncate" title={e.description}>
          {e.description || '-'}
        </p>
      ),
    },
    {
      header: 'Amount',
      key: 'amount',
      sortable: true,
      align: 'right',
      render: (e) => (
        <span className="text-sm font-bold text-darkblue-900">₹{Number(e.amount).toLocaleString('en-IN')}</span>
      ),
    },
  ];

  if (loading) return <Spinner text="Loading your expenses..." />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-darkblue-900">Expenses</h2>
          <p className="text-sm text-darkblue-500 mt-0.5">Track your daily spending</p>
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
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ amount: '', category: 'grocery', description: '', expense_date: new Date().toISOString().split('T')[0] }); }}
            className="inline-flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-darkblue-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses..."
            className="w-full pl-10 pr-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-white"
          />
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-darkblue-400" />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white appearance-none min-w-[140px]"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
          <div className="relative flex-1 sm:flex-none">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-darkblue-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white appearance-none min-w-[150px]"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{categoryEmojis[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="bg-white rounded-2xl border border-darkblue-200 p-4 mt-4 mb-4 flex items-center justify-between">
        <span className="text-sm text-darkblue-500">Total ({filtered.length} expenses)</span>
        <span className="text-lg font-bold text-darkblue-900">₹{totalFiltered.toLocaleString('en-IN')}</span>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-darkblue-100">
              <h3 className="text-lg font-semibold text-darkblue-900">{editingId ? 'Edit Expense' : 'Add Expense'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-darkblue-100 text-darkblue-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{categoryEmojis[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="What did you spend on?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-darkblue-400" />
                  <input
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-gold-600 hover:bg-gold-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {editingId ? 'Update Expense' : 'Add Expense'}
              </button>
            </form>
          </div>
        </div>
      )}

      <DataTable
        data={filtered}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No expenses found. Start tracking your spending!"
        emptyIcon={Receipt}
      />
    </div>
  );
}
