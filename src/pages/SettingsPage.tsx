import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Settings, User, Key, Copy, Check, Loader2, Pencil, X, AlertCircle, ShieldCheck, Palette, Moon } from 'lucide-react';
import Spinner from '../components/spinner';
import toast from 'react-hot-toast';

type Theme = 'default' | 'darkblue' | 'violet' | 'royalblue' | 'dark';

export function SettingsPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // theme fields
  const [currentTheme, setCurrentTheme] = useState<Theme>((localStorage.getItem('hw-theme') as Theme) || 'default');

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
      toast.error('Display name is required');
      return;
    }

    setSaving(true);

    try {
      // 1. Update your custom users table
      const { error: dbError } = await supabase.from('users')
        .update({
          display_name: displayName.trim(),
          phone: phone.trim(),
        })
        .eq('id', user!.id);

      if (dbError) throw dbError;

      // 2. Also update Supabase Auth user_metadata so the name
      //    reflects everywhere (email templates, auth.users, etc.)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
          full_name: displayName.trim(),
        },
      });

      if (authError) throw authError;

      toast.success('Profile updated successfully');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (theme: Theme) => {
    setCurrentTheme(theme);
    localStorage.setItem('hw-theme', theme);
    if (theme === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    toast.success(`${theme.charAt(0).toUpperCase() + theme.slice(1)} theme applied`);
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
    try {
      const { error: pwError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (pwError) throw pwError;

      toast.success('Password updated successfully');
      setPasswordSaved(true);
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
      toast.error(err.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const copyUserId = () => {
    if (user) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      toast.success('User ID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <Spinner text="Loading your settings..." />;

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-darkblue-900">Settings</h2>
        <p className="text-sm text-darkblue-500 mt-0.5">Manage your account and preferences</p>
      </div>

      {/* ── Theme Selection Card ── */}
      <div className="bg-white rounded-2xl border border-darkblue-200 overflow-hidden">
        <div className="p-5 border-b border-darkblue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <Palette className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-darkblue-900">App Theme</h3>
              <p className="text-xs text-darkblue-500">Choose your preferred color scheme</p>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Default Theme */}
          <button
            onClick={() => handleThemeChange('default')}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              currentTheme === 'default' ? 'border-darkgreen-600 bg-darkgreen-50' : 'border-darkblue-100 hover:border-darkblue-200'
            }`}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: '#023020' }}>
              <div className="w-3 h-3 rounded-full bg-gold-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-darkblue-900">Dark Green & Gold</p>
              <p className="text-xs text-darkblue-400">Default Classic</p>
            </div>
            {currentTheme === 'default' && <Check className="w-4 h-4 text-darkgreen-600 ml-auto" />}
          </button>

          {/* Dark Blue Theme */}
          <button
            onClick={() => handleThemeChange('darkblue')}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              currentTheme === 'darkblue' ? 'border-darkblue-600 bg-darkblue-50' : 'border-darkblue-100 hover:border-darkblue-200'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-darkblue-900 flex items-center justify-center shadow-sm">
              <div className="w-3 h-3 rounded-full bg-gold-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-darkblue-900">Dark Blue & Gold</p>
              <p className="text-xs text-darkblue-400">Premium Professional</p>
            </div>
            {currentTheme === 'darkblue' && <Check className="w-4 h-4 text-darkblue-600 ml-auto" />}
          </button>

          {/* Violet Theme */}
          <button
            onClick={() => handleThemeChange('violet')}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              currentTheme === 'violet' ? 'border-violet-600 bg-violet-50' : 'border-darkblue-100 hover:border-darkblue-200'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-violet-900 flex items-center justify-center shadow-sm">
              <div className="w-3 h-3 rounded-full bg-gold-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-darkblue-900">Violet & Gold</p>
              <p className="text-xs text-darkblue-400">Elegant Modern</p>
            </div>
            {currentTheme === 'violet' && <Check className="w-4 h-4 text-violet-600 ml-auto" />}
          </button>

          {/* Royal Blue Theme */}
          <button
            onClick={() => handleThemeChange('royalblue')}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              currentTheme === 'royalblue' ? 'border-royalblue-600 bg-royalblue-50' : 'border-darkblue-100 hover:border-darkblue-200'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-royalblue-900 flex items-center justify-center shadow-sm">
              <div className="w-3 h-3 rounded-full bg-gold-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-darkblue-900">Royal Blue & Gold</p>
              <p className="text-xs text-darkblue-400">Majestic Elegance</p>
            </div>
            {currentTheme === 'royalblue' && <Check className="w-4 h-4 text-royalblue-600 ml-auto" />}
          </button>

          {/* Dark Mode */}
          <button
            onClick={() => handleThemeChange('dark')}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              currentTheme === 'dark' ? 'border-slate-600 bg-slate-900' : 'border-darkblue-100 hover:border-darkblue-200'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center shadow-sm border border-slate-800">
              <Moon className="w-4 h-4 text-gold-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-darkblue-900">Dark Mode</p>
              <p className="text-xs text-darkblue-400">Night Guardian</p>
            </div>
            {currentTheme === 'dark' && <Check className="w-4 h-4 text-slate-400 ml-auto" />}
          </button>
        </div>
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
      <div className="bg-white rounded-2xl border border-darkblue-200 overflow-hidden">
        <div className="p-5 border-b border-darkblue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-50 flex items-center justify-center">
              <User className="w-5 h-5 text-gold-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-darkblue-900">Profile</h3>
              <p className="text-xs text-darkblue-500">Your display name updates across the entire app</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* Display Name */}
          <div>
            <label className="block text-xs font-medium text-darkblue-700 uppercase tracking-wide mb-1.5">
              Display Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setError(''); }}
                className="w-full px-4 py-2.5 pr-10 border border-darkblue-200 rounded-xl text-sm text-darkblue-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder="Enter your display name"
              />
              <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-darkblue-400 pointer-events-none" />
            </div>
            <p className="text-xs text-darkblue-400 mt-1">
              This name is shown across the app and in Supabase Auth metadata.
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-darkblue-700 uppercase tracking-wide mb-1.5">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm text-darkblue-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          {/* Email — read only */}
          <div>
            <label className="block text-xs font-medium text-darkblue-700 uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              className="w-full px-4 py-2.5 border border-darkblue-100 rounded-xl text-sm bg-darkblue-50 text-darkblue-400 cursor-not-allowed"
              disabled
            />
            <p className="text-xs text-darkblue-400 mt-1">Email cannot be changed here.</p>
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
            className="flex items-center gap-2 px-5 py-2.5 bg-gold-600 hover:bg-gold-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
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
      <div className="bg-white rounded-2xl border border-darkblue-200 overflow-hidden">
        <div className="p-5 border-b border-darkblue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-darkblue-50 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-darkblue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-darkblue-900">Password</h3>
                <p className="text-xs text-darkblue-500">Change your account password</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowPasswordForm((v) => !v);
                setPasswordError('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-darkblue-600 bg-darkblue-100 hover:bg-darkblue-200 rounded-lg transition-colors"
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
              <label className="block text-xs font-medium text-darkblue-700 uppercase tracking-wide mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm text-darkblue-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder="Min. 6 characters"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-darkblue-700 uppercase tracking-wide mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordChange(); }}
                className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm text-darkblue-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
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
              className="flex items-center gap-2 px-5 py-2.5 bg-gold-600 hover:bg-gold-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {passwordSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {passwordSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        )}

        {!showPasswordForm && (
          <div className="px-5 py-4">
            <p className="text-sm text-darkblue-400">••••••••••••</p>
          </div>
        )}
      </div>

      {/* ── User ID Card ── */}
      <div className="bg-white rounded-2xl border border-darkblue-200 overflow-hidden">
        <div className="p-5 border-b border-darkblue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-darkblue-50 flex items-center justify-center">
              <Key className="w-5 h-5 text-darkblue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-darkblue-900">Your User ID</h3>
              <p className="text-xs text-darkblue-500">Share this with family members to add you to their group</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-2.5 bg-darkblue-50 rounded-xl text-xs text-darkblue-600 font-mono break-all">
              {user?.id}
            </code>
            <button
              onClick={copyUserId}
              className="p-2.5 rounded-xl bg-darkblue-50 hover:bg-darkblue-100 text-darkblue-500 transition-colors shrink-0"
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
      <div className="bg-white rounded-2xl border border-darkblue-200 overflow-hidden">
        <div className="p-5 border-b border-darkblue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-darkblue-50 flex items-center justify-center">
              <Settings className="w-5 h-5 text-darkblue-600" />
            </div>
            <h3 className="text-base font-semibold text-darkblue-900">About</h3>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-darkblue-500">App Name</span>
            <span className="text-sm font-medium text-darkblue-900">HomeWallet</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-darkblue-500">Version</span>
            <span className="text-sm font-medium text-darkblue-900">1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-darkblue-500">Plan</span>
            <span className="text-sm font-medium text-gold-600 bg-gold-50 px-2 py-0.5 rounded-lg">Free</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-darkblue-500">Logged in as</span>
            <span className="text-sm font-medium text-darkblue-900 truncate max-w-[200px]">{user?.email}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
