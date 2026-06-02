import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, X, Loader2, Shield, CircleUser as UserCircle, Trash2, Crown, Edit2, Download, FileSpreadsheet } from 'lucide-react';
import Spinner from '../components/spinner';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';

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
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [familyName, setFamilyName] = useState('');

  useEffect(() => {
    if (user) loadFamilies();
  }, [user]);

  const loadFamilies = async () => {
    setLoading(true);
    const { data: memberData } = await supabase
      .from('families')
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
      .from('families')
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
    if (editingFamilyId) {
      await supabase.from('families').update({ name: familyName }).eq('id', editingFamilyId);
      setEditingFamilyId(null);
    } else {
      const { data: family } = await supabase
        .from('families')
        .insert({ name: familyName, created_by: user!.id })
        .select()
        .single();

      if (family) {
        await supabase.from('families').insert({
          family_id: family.id,
          user_id: user!.id,
          role: 'admin',
        });
      }
    }
    setFamilyName('');
    setShowForm(false);
    loadFamilies();
  };

  const handleEditFamily = (family: Family) => {
    setFamilyName(family.name);
    setEditingFamilyId(family.id);
    setShowForm(true);
  };

  const handleExportPDF = (family: Family) => {
    const familyMembers = members[family.id] || [];
    const headers = [['Name', 'Role', 'Joined Date']];
    const data = familyMembers.map((m) => [
      profiles[m.user_id]?.full_name || 'Unknown',
      m.role,
      new Date(m.created_at).toLocaleDateString('en-IN'),
    ]);
    exportToPDF(`${family.name} Members`, headers, data, `${family.name.toLowerCase()}_members`);
  };

  const handleExportExcel = (family: Family) => {
    const familyMembers = members[family.id] || [];
    const data = familyMembers.map((m) => ({
      Name: profiles[m.user_id]?.full_name || 'Unknown',
      Role: m.role,
      JoinedDate: m.created_at,
    }));
    exportToExcel(data, `${family.name.toLowerCase()}_members`);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showInviteForm) return;

    // Find user by ID in profiles (assuming inviteEmail is user ID as per original code)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', inviteEmail)
      .maybeSingle();

    if (profileData) {
      await supabase.from('families').insert({
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
    await supabase.from('families').delete().eq('id', memberId);
    loadFamilies();
  };

  if (loading) return <Spinner text="Loading your families..." />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-darkblue-900">Family</h2>
          <p className="text-sm text-darkblue-500 mt-0.5">Manage family groups and shared access</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingFamilyId(null); setFamilyName(''); }}
          className="inline-flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Family
        </button>
      </div>

      {/* Create/Edit Family Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-darkblue-100">
              <h3 className="text-lg font-semibold text-darkblue-900">{editingFamilyId ? 'Edit Family Group' : 'Create Family Group'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-darkblue-100 text-darkblue-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFamily} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">Family Name</label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="e.g., Sharma Family"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gold-600 hover:bg-gold-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {editingFamilyId ? 'Update Family' : 'Create Family'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowInviteForm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-darkblue-100">
              <h3 className="text-lg font-semibold text-darkblue-900">Add Family Member</h3>
              <button onClick={() => setShowInviteForm(null)} className="p-1.5 rounded-lg hover:bg-darkblue-100 text-darkblue-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-darkblue-700 mb-1">User ID</label>
                <input
                  type="text"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-darkblue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Enter user's UUID"
                  required
                />
                <p className="text-xs text-darkblue-400 mt-1">Ask the family member for their User ID from Settings</p>
              </div>
              <button
                type="submit"
                className="w-full bg-gold-600 hover:bg-gold-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Add Member
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Families */}
      { families.length === 0 ? (
        <div className="text-center py-16 text-darkblue-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No family groups yet. Create one to share expenses!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {families.map((family) => {
            const familyMembers = members[family.id] || [];
            const isAdmin = familyMembers.some((m) => m.user_id === user!.id && m.role === 'admin');

            return (
              <div key={family.id} className="bg-white rounded-2xl border border-darkblue-200 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-darkblue-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gold-50 flex items-center justify-center">
                        <Users className="w-6 h-6 text-gold-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-darkblue-900">{family.name}</h3>
                          {isAdmin && (
                            <button onClick={() => handleEditFamily(family)} className="p-1 hover:bg-darkblue-100 rounded-lg text-darkblue-400 hover:text-gold-600 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-darkblue-500">{familyMembers.length} member(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-white border border-darkblue-200 rounded-lg p-0.5 shadow-sm">
                        <button
                          onClick={() => handleExportPDF(family)}
                          className="p-1.5 hover:bg-darkblue-50 text-darkblue-400 transition-colors rounded flex items-center gap-1 text-[10px] font-medium"
                          title="Download PDF"
                        >
                          <Download className="w-3 h-3 text-rose-500" />
                        </button>
                        <div className="w-px h-3 bg-darkblue-200 mx-0.5" />
                        <button
                          onClick={() => handleExportExcel(family)}
                          className="p-1.5 hover:bg-darkblue-50 text-darkblue-400 transition-colors rounded flex items-center gap-1 text-[10px] font-medium"
                          title="Download Excel"
                        >
                          <FileSpreadsheet className="w-3 h-3 text-emerald-500" />
                        </button>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => setShowInviteForm(family.id)}
                          className="text-xs font-medium bg-gold-50 text-gold-700 px-3 py-1.5 rounded-lg hover:bg-gold-100 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Member
                        </button>
                      )}
                    </div>
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
                          className="flex items-center gap-3 p-3 rounded-xl bg-darkblue-50/50"
                        >
                          <div className="w-10 h-10 rounded-full bg-white border border-darkblue-200 flex items-center justify-center shadow-sm">
                            {isMemberAdmin ? (
                              <Crown className="w-5 h-5 text-amber-500" />
                            ) : (
                              <UserCircle className="w-5 h-5 text-darkblue-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-darkblue-900">
                              {profile?.full_name || 'Unknown'}
                              {isCurrentUser && <span className="text-xs text-darkblue-400 ml-1">(You)</span>}
                            </p>
                            <p className="text-xs text-darkblue-500 flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              {isMemberAdmin ? 'Admin' : 'Member'}
                            </p>
                          </div>
                          {isAdmin && !isCurrentUser && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-1.5 rounded-lg hover:bg-darkblue-200 text-darkblue-400 hover:text-red-500 transition-colors"
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
