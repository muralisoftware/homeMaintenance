import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, X, Wrench, Trash2, Calendar, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';
import Spinner from '../components/spinner';

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
    await supabase.from('maintenance_tasks').insert({
      user_id: user!.id,
      task_name: form.task_name,
      category: form.category,
      due_date: form.due_date,
      is_recurring: form.is_recurring,
      recurring_frequency: form.is_recurring ? `every ${form.recurring_frequency} months` : '',
      notes: form.notes,
    });
    setForm({
      task_name: '', category: 'ac_service', due_date: new Date().toISOString().split('T')[0],
      is_recurring: false, recurring_frequency: '6', notes: '',
    });
    setShowForm(false);
    loadTasks();
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

  if (loading) return <Spinner text="Loading your maintenance tasks..." />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Home Maintenance</h2>
          <p className="text-sm text-slate-500 mt-0.5">Keep your home running smoothly</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Task
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
              <p className="text-2xl font-bold text-slate-900">{tasks.filter((t) => !t.is_completed).length}</p>
              <p className="text-xs text-slate-500">Pending</p>
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
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{tasks.filter((t) => t.is_completed).length}</p>
              <p className="text-xs text-slate-500">Completed</p>
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
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Add Maintenance Task</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task Name</label>
                <input
                  type="text"
                  value={form.task_name}
                  onChange={(e) => setForm({ ...form, task_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., AC annual service"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {MAINT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{maintIcons[c]} {maintLabels[c]}</option>
                  ))}
                </select>
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
                <span className="text-sm text-slate-700">Recurring task</span>
              </div>
              {form.is_recurring && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Every (months)</label>
                  <input
                    type="number"
                    value={form.recurring_frequency}
                    onChange={(e) => setForm({ ...form, recurring_frequency: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    min="1"
                    max="60"
                  />
                </div>
              )}
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
                Add Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Task List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No maintenance tasks yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const daysLeft = Math.ceil(
              (new Date(task.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            const isOverdue = daysLeft < 0 && !task.is_completed;
            const isUrgent = daysLeft <= 7 && daysLeft >= 0 && !task.is_completed;

            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl border p-4 flex items-center gap-3 hover:shadow-sm transition-shadow ${
                  task.is_completed
                    ? 'border-slate-100 opacity-70'
                    : isOverdue
                    ? 'border-red-200 bg-red-50/30'
                    : isUrgent
                    ? 'border-amber-200 bg-amber-50/30'
                    : 'border-slate-200'
                }`}
              >
                <button
                  onClick={() => toggleComplete(task)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    task.is_completed
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-slate-300 hover:border-teal-400'
                  }`}
                >
                  {task.is_completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg flex-shrink-0">
                  {maintIcons[task.category] || '🔧'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.is_completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                    {task.task_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {maintLabels[task.category] || task.category}
                    {' · '}
                    Due {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {!task.is_completed && (
                      <span className={`ml-1 ${isOverdue ? 'text-red-500 font-medium' : isUrgent ? 'text-amber-600 font-medium' : ''}`}>
                        {isOverdue ? '(Overdue!)' : isUrgent ? `(${daysLeft}d left)` : `(${daysLeft}d left)`}
                      </span>
                    )}
                    {task.is_recurring && <span className="ml-1 text-teal-500">· Recurring</span>}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(task.id)}
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
