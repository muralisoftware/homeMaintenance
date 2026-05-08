import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Settings, User, Key, Copy, Check, Loader2 } from 'lucide-react';

export function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ full_name: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .maybeSingle();
    if (data) {
      setProfile({ full_name: data.full_name || '', phone: data.phone || '' });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
      })
      .eq('id', user!.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const copyUserId = () => {
    if (user) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <User className="w-5 h-5 text-teal-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Profile</h3>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="+91 XXXXX XXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500"
              disabled
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* User ID */}
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
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"
              title="Copy User ID"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* App Info */}
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
            <span className="text-sm font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded">Free</span>
          </div>
        </div>
      </div>
    </div>
  );
}
