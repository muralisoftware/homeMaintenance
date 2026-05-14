import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Settings, User, Key, Copy, Check, Loader2, Pencil, X, AlertCircle, ShieldCheck,} from 'lucide-react';
import Spinner from '../components/spinner';

export function SettingsPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // profile fields
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  // password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').eq('id', user!.id).maybeSingle();

    if (data) {
      setDisplayName(data.display_name || '');
      setPhone(data.phone || '');
    } else {
      // fallback to auth metadata if no row yet
      setDisplayName(user?.user_metadata?.full_name || user?.user_metadata?.display_name || '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setError('');
    if (!displayName.trim()) {
      setError('Display name cannot be empty.');
      return;
    }

    setSaving(true);

    // 1. Update your custom users table
    const { error: dbError } = await supabase.from('users')
      .update({
        display_name: displayName.trim(),
        phone: phone.trim(),
      })
      .eq('id', user!.id);

    if (dbError) {
      setError('Failed to update profile. Please try again.');
      setSaving(false);
      return;
    }

    // 2. Also update Supabase Auth user_metadata so the name
    //    reflects everywhere (email templates, auth.users, etc.)
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        display_name: displayName.trim(),
        full_name: displayName.trim(),
      },
    });

    if (authError) {
      setError('Profile saved but auth metadata update failed.');
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    if (!newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    const { error: pwError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (pwError) {
      setPasswordError(pwError.message || 'Failed to update password.');
    } else {
      setPasswordSaved(true);
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      setTimeout(() => setPasswordSaved(false), 3000);
    }
    setPasswordSaving(false);
  };

  const copyUserId = () => {
    if (user) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <Spinner text="Loading your settings..." />;

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Global success */}
      {saved && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">Profile updated successfully!</p>
        </div>
      )}

      {/* Password success */}
      {passwordSaved && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">Password changed successfully!</p>
        </div>
      )}

      {/* ── Profile Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <User className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Profile</h3>
              <p className="text-xs text-slate-500">Your display name updates across the entire app</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* Display Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 uppercase tracking-wide mb-1.5">
              Display Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setError(''); }}
                className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Enter your display name"
              />
              <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              This name is shown across the app and in Supabase Auth metadata.
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-slate-700 uppercase tracking-wide mb-1.5">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          {/* Email — read only */}
          <div>
            <label className="block text-xs font-medium text-slate-700 uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              className="w-full px-4 py-2.5 border border-slate-100 rounded-xl text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
              disabled
            />
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed here.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {saving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : saved
              ? <Check className="w-4 h-4" />
              : null}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── Password Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Password</h3>
                <p className="text-xs text-slate-500">Change your account password</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowPasswordForm((v) => !v);
                setPasswordError('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {showPasswordForm
                ? <><X className="w-3.5 h-3.5" /> Cancel</>
                : <><Pencil className="w-3.5 h-3.5" /> Change</>}
            </button>
          </div>
        </div>

        {showPasswordForm && (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 uppercase tracking-wide mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Min. 6 characters"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 uppercase tracking-wide mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordChange(); }}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Re-enter new password"
              />
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-600">{passwordError}</p>
              </div>
            )}

            <button
              onClick={handlePasswordChange}
              disabled={passwordSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {passwordSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {passwordSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        )}

        {!showPasswordForm && (
          <div className="px-5 py-4">
            <p className="text-sm text-slate-400">••••••••••••</p>
          </div>
        )}
      </div>

      {/* ── User ID Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
              <Key className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Your User ID</h3>
              <p className="text-xs text-slate-500">Share this with family members to add you to their group</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-2.5 bg-slate-50 rounded-xl text-xs text-slate-600 font-mono break-all">
              {user?.id}
            </code>
            <button
              onClick={copyUserId}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors shrink-0"
              title="Copy User ID"
            >
              {copied
                ? <Check className="w-4 h-4 text-emerald-500" />
                : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── About Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
              <Settings className="w-5 h-5 text-slate-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">About</h3>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">App Name</span>
            <span className="text-sm font-medium text-slate-900">HomeWallet</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Version</span>
            <span className="text-sm font-medium text-slate-900">1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Plan</span>
            <span className="text-sm font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg">Free</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Logged in as</span>
            <span className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{user?.email}</span>
          </div>
        </div>
      </div>

    </div>
  );
}