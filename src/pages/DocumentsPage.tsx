import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, X, FolderLock, Trash2, Loader2, FileText, Calendar, AlertTriangle,
} from 'lucide-react';
import Spinner from '../components/spinner';

const DOC_TYPES = [
  'eb_receipt', 'insurance', 'house_tax', 'id_proof', 'warranty',
  'medical', 'property', 'bank', 'other',
];

const docIcons: Record<string, string> = {
  eb_receipt: '⚡', insurance: '🛡️', house_tax: '🏠', id_proof: '🪪',
  warranty: '📋', medical: '🏥', property: '🏗️', bank: '🏦', other: '📄',
};

const docLabels: Record<string, string> = {
  eb_receipt: 'EB Receipt', insurance: 'Insurance', house_tax: 'House Tax Receipt',
  id_proof: 'ID Proof (Aadhaar/PAN)', warranty: 'Warranty Bill', medical: 'Medical Record',
  property: 'Property Document', bank: 'Bank Document', other: 'Other',
};

interface Document {
  id: string;
  title: string;
  document_type: string;
  file_url: string;
  file_type: string;
  notes: string;
  expiry_date: string | null;
  created_at: string;
}

export function DocumentsPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({
    title: '',
    document_type: 'other',
    file_url: '',
    file_type: '',
    notes: '',
    expiry_date: '',
  });

  useEffect(() => {
    if (user) loadDocs();
  }, [user]);

  const loadDocs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setDocs(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('documents').insert({
      user_id: user!.id,
      title: form.title,
      document_type: form.document_type,
      file_url: form.file_url,
      file_type: form.file_type,
      notes: form.notes,
      expiry_date: form.expiry_date || null,
    });
    setForm({ title: '', document_type: 'other', file_url: '', file_type: '', notes: '', expiry_date: '' });
    setShowForm(false);
    loadDocs();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('documents').delete().eq('id', id);
    loadDocs();
  };

  const filtered = docs.filter((d) => !filter || d.document_type === filter);

  const expiringDocs = docs.filter((d) => {
    if (!d.expiry_date) return false;
    const days = Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 30 && days >= 0;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Digital Locker</h2>
          <p className="text-sm text-slate-500 mt-0.5">Securely store important documents and receipts</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Document
        </button>
      </div>

      {/* Expiring soon alert */}
      {expiringDocs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">{expiringDocs.length} document(s) expiring soon</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {expiringDocs.map((d) => d.title).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            !filter ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All
        </button>
        {DOC_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === t ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {docIcons[t]} {docLabels[t]}
          </button>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Add Document</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., EB Bill March 2025"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Document Type</label>
                <select
                  value={form.document_type}
                  onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>{docIcons[t]} {docLabels[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">File URL / Link</label>
                <input
                  type="url"
                  value={form.file_url}
                  onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="https://example.com/document.pdf"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">File Type</label>
                <input
                  type="text"
                  value={form.file_type}
                  onChange={(e) => setForm({ ...form, file_type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., PDF, JPG, PNG"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date (optional)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
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
                Save Document
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Document Grid */}
      {loading ? (
        <Spinner  text="Loading your documents..." />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FolderLock className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No documents stored yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => {
            const isExpiring = doc.expiry_date && Math.ceil((new Date(doc.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 30;
            const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();

            return (
              <div
                key={doc.id}
                className={`bg-white rounded-xl border p-4 hover:shadow-md transition-shadow ${
                  isExpired ? 'border-red-200' : isExpiring ? 'border-amber-200' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg">
                    {docIcons[doc.document_type] || '📄'}
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4 className="text-sm font-medium text-slate-900 mb-1">{doc.title}</h4>
                <p className="text-xs text-slate-500 mb-3">
                  {docLabels[doc.document_type] || doc.document_type}
                  {doc.file_type && ` · ${doc.file_type.toUpperCase()}`}
                </p>
                {doc.expiry_date && (
                  <div className={`text-xs px-2 py-1 rounded-lg inline-flex items-center gap-1 ${
                    isExpired ? 'bg-red-50 text-red-600' : isExpiring ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'
                  }`}>
                    <Calendar className="w-3 h-3" />
                    {isExpired ? 'Expired' : 'Expires'} {new Date(doc.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
                {doc.file_url && (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    View Document
                  </a>
                )}
                {doc.notes && (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{doc.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
