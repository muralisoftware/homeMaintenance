import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, X, Wrench, Trash2, Calendar, CheckCircle2, Clock, AlertTriangle, Edit2, Download, FileSpreadsheet,
} from 'lucide-react';
import Spinner from '../components/spinner';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';
import { DataTable, Column } from '../components/DataTable';

const MAINT_CATEGORIES = [
  'ac_service', 'bike_service', 'car_service', 'water_tank', 'pest_control',
  'gas_refill', 'plumbing', 'electrical', 'cleaning', 'painting', 'other',
];

const maintIcons: Record<string, string> = {
  ac_service: '❄️', bike_service: '🏍️', car_service: '🚗', water_tank: '💧',
  pest_control: '🐛', gas_refill: '🔥', plumbing: '🔧', electrical: '⚡',
  cleaning: '🧹', painting: '🎨', other: '🔧',
};

const maintLabels: Record<string, string> = {
  ac_service: 'AC Service', bike_service: 'Bike Service', car_service: 'Car Service',
  water_tank: 'Water Tank Cleaning', pest_control: 'Pest Control', gas_refill: 'Gas Refill',
  plumbing: 'Plumbing', electrical: 'Electrical', cleaning: 'Cleaning',
  painting: 'Painting', other: 'Other',
};

interface MaintenanceTask {
  id: string;
  task_name: string;
  category: string;
  due_date: string;
  is_completed: boolean;
  is_recurring: boolean;
  recurring_frequency: string;
  last_completed_date: string | null;
  notes: string;
}

export function MaintenancePage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [form, setForm] = useState({
    task_name: '',
    category: 'ac_service',
    due_date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    recurring_frequency: '6',
    notes: '',
  });

  useEffect(() => {
    if (user) loadTasks();
  }, [user]);

  const loadTasks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('maintenance_tasks')
      .select('*')
      .eq('user_id', user!.id)
      .order('due_date', { ascending: true });
    setTasks(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const taskData = {
      user_id: user!.id,
      task_name: form.task_name,
      category: form.category,
      due_date: form.due_date,
      is_recurring: form.is_recurring,
      recurring_frequency: form.is_recurring ? `every ${form.recurring_frequency} months` : '',
      notes: form.notes,
    };

    if (editingId) {
      await supabase.from('maintenance_tasks').update(taskData).eq('id', editingId);
      setEditingId(null);
    } else {
      await supabase.from('maintenance_tasks').insert(taskData);
    }

    setForm({
      task_name: '', category: 'ac_service', due_date: new Date().toISOString().split('T')[0],
      is_recurring: false, recurring_frequency: '6', notes: '',
    });
    setShowForm(false);
    loadTasks();
  };

  const handleEdit = (task: MaintenanceTask) => {
    setForm({
      task_name: task.task_name,
      category: task.category,
      due_date: task.due_date,
      is_recurring: task.is_recurring,
      recurring_frequency: task.recurring_frequency ? task.recurring_frequency.replace(/[^0-9]/g, '') : '6',
      notes: task.notes || '',
    });
    setEditingId(task.id);
    setShowForm(true);
  };

  const handleExportPDF = () => {
    const headers = [['Due Date', 'Task', 'Category', 'Status', 'Notes']];
    const data = filtered.map((t) => [
      new Date(t.due_date).toLocaleDateString('en-IN'),
      t.task_name,
      maintLabels[t.category] || t.category,
      t.is_completed ? 'Completed' : 'Pending',
      t.notes || '-',
    ]);
    exportToPDF('Maintenance Tasks Report', headers, data, 'maintenance_report');
  };

  const handleExportExcel = () => {
    const data = filtered.map((t) => ({
      DueDate: t.due_date,
      Task: t.task_name,
      Category: maintLabels[t.category] || t.category,
      Status: t.is_completed ? 'Completed' : 'Pending',
      Notes: t.notes,
    }));
    exportToExcel(data, 'maintenance_report');
  };

  const toggleComplete = async (task: MaintenanceTask) => {
    const isCompleted = !task.is_completed;
    await supabase
      .from('maintenance_tasks')
      .update({
        is_completed: isCompleted,
        last_completed_date: isCompleted ? new Date().toISOString().split('T')[0] : null,
      })
      .eq('id', task.id);
    loadTasks();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('maintenance_tasks').delete().eq('id', id);
    loadTasks();
  };

  const filtered = tasks.filter((t) => {
    if (filter === 'pending') return !t.is_completed;
    if (filter === 'completed') return t.is_completed;
    return true;
  });

  const overdueCount = tasks.filter((t) => !t.is_completed && new Date(t.due_date) < new Date()).length;

  const columns: Column<MaintenanceTask>[] = [
    {
      header: 'Status',
      key: 'is_completed',
      render: (task) => (
        <button
          onClick={() => toggleComplete(task)}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            task.is_completed
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-darkblue-300 hover:border-gold-400'
          }`}
        >
          {task.is_completed && <CheckCircle2 className="w-4 h-4 text-white" />}
        </button>
      ),
    },
    {
      header: 'Task / Category',
      key: 'task_name',
      sortable: true,
      render: (task) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-darkblue-50 flex items-center justify-center text-sm">
            {maintIcons[task.category] || '🔧'}
          </div>
          <div className="flex flex-col">
            <span className={`text-sm font-medium ${task.is_completed ? 'text-darkblue-400 line-through' : 'text-darkblue-900'}`}>
              {task.task_name}
            </span>
            <span className="text-xs text-darkblue-400">
              {maintLabels[task.category] || task.category}
              {task.is_recurring && <span className="ml-1 text-gold-500">· Recurring</span>}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Due Date',
      key: 'due_date',
      sortable: true,
      render: (task) => {
        const daysLeft = Math.ceil(
          (new Date(task.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        const isOverdue = daysLeft < 0 && !task.is_completed;
        const isUrgent = daysLeft <= 7 && daysLeft >= 0 && !task.is_completed;

        return (
          <div className="flex flex-col">
            <span className={`text-sm font-medium ${task.is_completed ? 'text-darkblue-400' : 'text-darkblue-900'}`}>
              {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {!task.is_completed ? (
              <span className={`text-[10px] font-bold uppercase ${isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-600' : 'text-darkblue-400'}`}>
                {isOverdue ? 'Overdue!' : `${daysLeft} days left`}
              </span>
            ) : task.last_completed_date && (
              <span className="text-[10px] text-emerald-500 font-bold uppercase">
                Done {new Date(task.last_completed_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Notes',
      key: 'notes',
      render: (task) => (
        <p className="text-xs text-darkblue-500 max-w-[150px] truncate" title={task.notes}>
          {task.notes || '-'}
        </p>
      ),
    },
  ];

  if (loading) return <Spinner text="Loading your maintenance tasks..." />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-darkblue-900">Home Maintenance</h2>
          <p className="text-sm text-darkblue-500 mt-0.5">Keep your home running smoothly</p>
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
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ task_name: '', category: 'ac_service', due_date: new Date().toISOString().split('T')[0], is_recurring: false, recurring_frequency: '6', notes: '' }); }}
            className="inline-flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Task
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
              <p className="text-2xl font-bold text-darkblue-900">{tasks.filter((t) => !t.is_completed).length}</p>
              <p className="text-xs text-darkblue-500">Pending</p>
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
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-darkblue-900">{tasks.filter((t) => t.is_completed).length}</p>
              <p className="text-xs text-darkblue-500">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'pending', 'completed'] as const).map((f) => (
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
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-darkblue-100">
              <h3 className="text-lg font-semibold text-darkblue-900">{editingId ? 'Edit Maintenance Task' : 'Add Maintenance Task'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-darkblue-100 text-darkblue-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Task Name</label>
                <input
                  type="text"
                  value={form.task_name}
                  onChange={(e) => setForm({ ...form, task_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="e.g., AC annual service"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white"
                >
                  {MAINT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{maintIcons[c]} {maintLabels[c]}</option>
                  ))}
                </select>
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
                <span className="text-sm text-darkblue-700">Recurring task</span>
              </div>
              {form.is_recurring && (
                <div>
                  <label className="block text-sm font-medium text-darkblue-700 mb-1">Every (months)</label>
                  <input
                    type="number"
                    value={form.recurring_frequency}
                    onChange={(e) => setForm({ ...form, recurring_frequency: e.target.value })}
                    className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    min="1"
                    max="60"
                  />
                </div>
              )}
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
                {editingId ? 'Update Task' : 'Add Task'}
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
        emptyMessage="No maintenance tasks yet"
        emptyIcon={Wrench}
      />
    </div>
  );
}
