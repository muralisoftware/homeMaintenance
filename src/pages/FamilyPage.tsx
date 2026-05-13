import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, X, Loader2, Shield, CircleUser as UserCircle, Trash2, Crown } from 'lucide-react';
import Spinner from '../components/spinner';

interface Family {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  email?: string;
}

export function FamilyPage() {
  const { user } = useAuth();
  const [families, setFamilies] = useState<Family[]>([]);
  const [members, setMembers] = useState<Record<string, FamilyMember[]>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [familyName, setFamilyName] = useState('');

  useEffect(() => {
    if (user) loadFamilies();
  }, [user]);

  const loadFamilies = async () => {
    setLoading(true);
    const { data: memberData } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user!.id);

    const familyIds = (memberData || []).map((m) => m.family_id);
    if (familyIds.length === 0) {
      setFamilies([]);
      setLoading(false);
      return;
    }

    const { data: familyData } = await supabase
      .from('families')
      .select('*')
      .in('id', familyIds);

    setFamilies(familyData || []);

    // Load members for each family
    const { data: allMembers } = await supabase
      .from('family_members')
      .select('*')
      .in('family_id', familyIds);

    const memberMap: Record<string, FamilyMember[]> = {};
    (allMembers || []).forEach((m) => {
      if (!memberMap[m.family_id]) memberMap[m.family_id] = [];
      memberMap[m.family_id].push(m);
    });
    setMembers(memberMap);

    // Load profiles for all member user_ids
    const userIds = [...new Set((allMembers || []).map((m) => m.user_id))];
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      const profileMap: Record<string, Profile> = {};
      (profileData || []).forEach((p) => {
        profileMap[p.id] = p;
      });
      setProfiles(profileMap);
    }

    setLoading(false);
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: family } = await supabase
      .from('families')
      .insert({ name: familyName, created_by: user!.id })
      .select()
      .single();

    if (family) {
      await supabase.from('family_members').insert({
        family_id: family.id,
        user_id: user!.id,
        role: 'admin',
      });
    }
    setFamilyName('');
    setShowForm(false);
    loadFamilies();
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showInviteForm) return;

    // Find user by email in auth - we'll use profiles table
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', inviteEmail)
      .maybeSingle();

    // Since we can't look up by email directly, we'll add by user ID
    // In a real app, this would use an invite system
    if (profileData) {
      await supabase.from('family_members').insert({
        family_id: showInviteForm,
        user_id: profileData.id,
        role: 'member',
      });
    }

    setInviteEmail('');
    setShowInviteForm(null);
    loadFamilies();
  };

  const handleRemoveMember = async (memberId: string) => {
    await supabase.from('family_members').delete().eq('id', memberId);
    loadFamilies();
  };

  if (loading) {
    return (
      <Spinner text="Loading your families..." />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Family</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage family groups and shared access</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Family
        </button>
      </div>

      {/* Create Family Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Create Family Group</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFamily} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Family Name</label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., Sharma Family"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Create Family
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowInviteForm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Add Family Member</h3>
              <button onClick={() => setShowInviteForm(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">User ID</label>
                <input
                  type="text"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter user's UUID"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Ask the family member for their User ID from Settings</p>
              </div>
              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Add Member
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Families */}
      { families.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No family groups yet. Create one to share expenses!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {families.map((family) => {
            const familyMembers = members[family.id] || [];
            const isAdmin = familyMembers.some((m) => m.user_id === user!.id && m.role === 'admin');

            return (
              <div key={family.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
                        <Users className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{family.name}</h3>
                        <p className="text-xs text-slate-500">{familyMembers.length} member(s)</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setShowInviteForm(family.id)}
                        className="text-xs font-medium bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Member
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <div className="space-y-3">
                    {familyMembers.map((member) => {
                      const profile = profiles[member.user_id];
                      const isCurrentUser = member.user_id === user!.id;
                      const isMemberAdmin = member.role === 'admin';

                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-slate-50"
                        >
                          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                            {isMemberAdmin ? (
                              <Crown className="w-5 h-5 text-amber-500" />
                            ) : (
                              <UserCircle className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">
                              {profile?.full_name || 'Unknown'}
                              {isCurrentUser && <span className="text-xs text-slate-400 ml-1">(You)</span>}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              {isMemberAdmin ? 'Admin' : 'Member'}
                            </p>
                          </div>
                          {isAdmin && !isCurrentUser && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
