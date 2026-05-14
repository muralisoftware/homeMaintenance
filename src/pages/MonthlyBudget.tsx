import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Wallet, Pencil, Trash2, Plus, X, Check, AlertCircle, TrendingUp, TrendingDown, IndianRupee,
} from 'lucide-react';
import Spinner from '../components/spinner';

interface BudgetHistory {
  id: string;
  monthly_budget: number;
  updated_at: string;
}

interface UserSetting {
  id: string;
  user_id: string;
  monthly_budget: number;
  created_at: string;
  updated_at: string;
}

// ─── MonthlyBudget Page ────────────────────────────────────────────────────────
export function MonthlyBudget() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [setting, setSetting] = useState<UserSetting | null>(null);
  const [currentBudget, setCurrentBudget] = useState<number>(0);

  // form state
  const [showForm, setShowForm] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // confirm delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchBudget();
  }, [user]);

  const fetchBudget = async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user!.id)
      .single();

    if (err && err.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine for new users
      setError('Failed to load budget settings.');
    }

    if (data) {
      setSetting(data);
      setCurrentBudget(Number(data.monthly_budget));
    }
    setLoading(false);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const openAddForm = () => {
    setBudgetInput('');
    setIsEditing(false);
    setShowForm(true);
    setError('');
  };

  const openEditForm = () => {
    setBudgetInput(String(currentBudget));
    setIsEditing(true);
    setShowForm(true);
    setError('');
  };

  const closeForm = () => {
    setShowForm(false);
    setBudgetInput('');
    setError('');
  };

  const handleSave = async () => {
    setError('');
    const value = parseFloat(budgetInput);
    if (isNaN(value) || value <= 0) {
      setError('Please enter a valid budget amount greater than 0.');
      return;
    }
    if (value > 100000000) {
      setError('Budget amount is too large.');
      return;
    }

    setSaving(true);
    const { data, error: err } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: user!.id,
          monthly_budget: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (err) {
      setError('Failed to save budget. Please try again.');
    } else {
      setSetting(data);
      setCurrentBudget(Number(data.monthly_budget));
      closeForm();
      showSuccess(isEditing ? 'Budget updated successfully!' : 'Budget set successfully!');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    const { error: err } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', user!.id);

    if (err) {
      setError('Failed to delete budget. Please try again.');
    } else {
      setSetting(null);
      setCurrentBudget(0);
      setShowDeleteConfirm(false);
      showSuccess('Budget deleted successfully.');
    }
    setDeleting(false);
  };

  // ── derived ──
  const hasBudget = setting !== null;
  const formattedBudget = currentBudget.toLocaleString('en-IN');
  const updatedDate = setting
    ? new Date(setting.updated_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;
  const updatedTime = setting
    ? new Date(setting.updated_at).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  if (loading) return <Spinner text="Loading your budget settings" />;
  
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Monthly Budget</h2>
          <p className="text-sm text-slate-500 mt-0.5">Set and manage your monthly spending limit</p>
        </div>
        {!hasBudget && (
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Set Budget
          </button>
        )}
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">{successMsg}</p>
        </div>
      )}

      {/* Error message */}
      {error && !showForm && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Current Budget Card */}
      {hasBudget ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">

          {/* Budget display */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Current Monthly Budget</p>
              <div className="flex items-center gap-2">
                <IndianRupee className="w-6 h-6 text-teal-600" />
                <span className="text-4xl font-bold text-slate-900">{formattedBudget}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Last updated: {updatedDate} at {updatedTime}
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center">
              <Wallet className="w-7 h-7 text-teal-600" />
            </div>
          </div>

          {/* Per-period breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1">Daily</p>
              <p className="text-base font-bold text-slate-800">
                ₹{Math.round(currentBudget / 30).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1">Weekly</p>
              <p className="text-base font-bold text-slate-800">
                ₹{Math.round(currentBudget / 4).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-teal-50 rounded-xl p-4 text-center border border-teal-100">
              <p className="text-[10px] text-teal-600 uppercase tracking-wider font-medium mb-1">Monthly</p>
              <p className="text-base font-bold text-teal-700">
                ₹{formattedBudget}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={openEditForm}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit Budget
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No budget set</h3>
          <p className="text-sm text-slate-500 mb-6">
            Set a monthly budget to track your savings and spending limits.
          </p>
          <button
            onClick={openAddForm}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Set Monthly Budget
          </button>
        </div>
      )}

      {/* Tips card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h4 className="text-sm font-semibold text-slate-900">Budget Tips</h4>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Set a realistic budget based on your average monthly income minus fixed expenses like EMIs and rent.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
              <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Review and update your budget every month as your income or expenses change.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0 mt-0.5">
              <Wallet className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your budget is used across the dashboard to calculate your monthly savings and spending progress.
            </p>
          </div>
        </div>
      </div>

      {/* ── Add / Edit Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">

            {/* Modal header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isEditing ? 'Edit Monthly Budget' : 'Set Monthly Budget'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isEditing ? 'Update your monthly spending limit' : 'Define your monthly spending limit'}
                </p>
              </div>
              <button
                onClick={closeForm}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                Monthly Budget Amount
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
                <input
                  type="number"
                  value={budgetInput}
                  onChange={(e) => { setBudgetInput(e.target.value); setError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') closeForm(); }}
                  placeholder="e.g. 50000"
                  min="1"
                  className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </p>
              )}
              {budgetInput && !isNaN(parseFloat(budgetInput)) && parseFloat(budgetInput) > 0 && (
                <p className="text-xs text-slate-400">
                  ≈ ₹{Math.round(parseFloat(budgetInput) / 30).toLocaleString('en-IN')} / day &nbsp;·&nbsp;
                  ₹{Math.round(parseFloat(budgetInput) / 4).toLocaleString('en-IN')} / week
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saving…' : isEditing ? 'Update Budget' : 'Set Budget'}
              </button>
              <button
                onClick={closeForm}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Budget?</h3>
                <p className="text-xs text-slate-500 mt-0.5">This will remove your monthly budget setting.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Your budget of <span className="font-semibold text-slate-900">₹{formattedBudget}</span> will be deleted.
              The dashboard will fall back to a default value until you set a new budget.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}