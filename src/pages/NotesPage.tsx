import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Pin, Plus, Trash2, Search, X, Check,
  StickyNote, Star, Tag, Clock, Home,
  Loader2, AlertCircle, RefreshCw, Filter, ChevronLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────
type NoteColor = 'yellow' | 'teal' | 'rose' | 'sky' | 'amber' | 'violet';

interface Note {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  pinned: boolean;
  tag: string;
  createdAt: Date;
}

interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: NoteColor;
  pinned: boolean;
  tag: string;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const COLORS: { key: NoteColor; bg: string; border: string; header: string; text: string; dot: string }[] = [
  { key: 'yellow', bg: '#fffbeb', border: '#fde68a', header: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  { key: 'teal',   bg: '#f0fdfa', border: '#99f6e4', header: '#ccfbf1', text: '#134e4a', dot: '#14b8a6' },
  { key: 'rose',   bg: '#fff1f2', border: '#fecdd3', header: '#ffe4e6', text: '#881337', dot: '#f43f5e' },
  { key: 'sky',    bg: '#f0f9ff', border: '#bae6fd', header: '#e0f2fe', text: '#0c4a6e', dot: '#0ea5e9' },
  { key: 'amber',  bg: '#fffbeb', border: '#fed7aa', header: '#ffedd5', text: '#7c2d12', dot: '#f97316' },
  { key: 'violet', bg: '#f5f3ff', border: '#ddd6fe', header: '#ede9fe', text: '#4c1d95', dot: '#8b5cf6' },
];

const TAGS = ['Budget', 'Bills', 'Shopping', 'Goals', 'Reminder', 'Ideas', 'Family'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const timeAgo = (d: Date) => {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const rowToNote = (row: NoteRow): Note => ({
  id: row.id,
  title: row.title,
  content: row.content,
  color: row.color,
  pinned: row.pinned,
  tag: row.tag,
  createdAt: new Date(row.created_at),
});

// ─── useIsMobile ─────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return isMobile;
}

// ─── NoteCard ─────────────────────────────────────────────────────────────────
function NoteCard({ note, onEdit, onDelete, onTogglePin, deleting, toggling }: {
  note: Note;
  onEdit: (n: Note) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  deleting: boolean;
  toggling: boolean;
}) {
  const c = COLORS.find(x => x.key === note.color)!;
  const [hovered, setHovered] = useState(false);
  const isMobile = useIsMobile();

  // On mobile always show action buttons (no hover state)
  const showActions = isMobile || hovered;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        borderRadius: '6px',
        boxShadow: hovered
          ? '0 12px 32px rgba(0,0,0,0.18)'
          : note.pinned
            ? `0 4px 16px rgba(0,0,0,0.12), 3px 0 0 0 ${c.dot}`
            : '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
        transform: hovered && !isMobile ? 'translateY(-3px)' : 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Kalam', cursive",
        opacity: deleting ? 0.4 : 1,
        width: '100%',
      }}
      onClick={() => !deleting && onEdit(note)}
    >
      {note.pinned && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: c.dot }} />
      )}

      {/* Header */}
      <div style={{
        background: c.header,
        padding: '10px 12px 8px',
        borderBottom: `1px solid ${c.border}`,
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: '8px',
      }}>
        <h3 style={{
          margin: 0, fontSize: '0.95rem', fontWeight: 700,
          color: c.text, lineHeight: 1.3, flex: 1,
          fontFamily: "'Kalam', cursive",
        }}>{note.title || 'Untitled'}</h3>

        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onTogglePin(note.id); }}
            disabled={toggling}
            style={{
              background: note.pinned ? c.dot : 'rgba(0,0,0,0.06)',
              border: 'none', borderRadius: '50%',
              width: '28px', height: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: toggling ? 'not-allowed' : 'pointer',
              color: note.pinned ? 'white' : c.text,
              opacity: showActions || note.pinned ? 1 : 0,
              transition: 'all 0.15s',
            }}
          >
            {toggling
              ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
              : <Pin size={13} />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(note.id); }}
            disabled={deleting}
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: 'none', borderRadius: '50%',
              width: '28px', height: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: deleting ? 'not-allowed' : 'pointer',
              color: '#ef4444',
              opacity: showActions ? 1 : 0,
              transition: 'all 0.15s',
            }}
          >
            {deleting
              ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
              : <Trash2 size={13} />}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px 10px', flex: 1 }}>
        <p style={{
          margin: 0, fontSize: '0.82rem', color: c.text,
          lineHeight: 1.65, whiteSpace: 'pre-wrap',
          display: '-webkit-box', WebkitLineClamp: 5,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
          opacity: 0.85,
        }}>{note.content}</p>
      </div>

      {/* Footer */}
      <div style={{
        padding: '6px 12px 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: `1px dashed ${c.border}`,
      }}>
        <span style={{
          fontSize: '0.68rem', fontWeight: 600, color: c.dot,
          background: c.header, padding: '2px 8px', borderRadius: '20px',
          border: `1px solid ${c.border}`,
        }}>{note.tag}</span>
        <span style={{ fontSize: '0.65rem', color: c.text, opacity: 0.5, display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Clock size={9} />{timeAgo(note.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ─── NoteModal ────────────────────────────────────────────────────────────────
function NoteModal({ note, onSave, onClose, saving }: {
  note: Partial<Note>;
  onSave: (n: Omit<Note, 'createdAt'> & { createdAt?: Date }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [title, setTitle]   = useState(note.title || '');
  const [content, setContent] = useState(note.content || '');
  const [color, setColor]   = useState<NoteColor>(note.color || 'yellow');
  const [tag, setTag]       = useState(note.tag || TAGS[0]);
  const c = COLORS.find(x => x.key === color)!;
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // slight delay so keyboard doesn't fight the modal animation on mobile
    const t = setTimeout(() => textRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  const handleSave = () => {
    if (!title.trim() && !content.trim()) return onClose();
    onSave({
      id: note.id || '',
      title: title.trim() || 'Untitled',
      content,
      color,
      pinned: note.pinned || false,
      tag,
      createdAt: note.createdAt,
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0',
    }} onClick={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div style={{
        background: c.bg,
        border: `2px solid ${c.border}`,
        borderRadius: '20px 20px 0 0',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -16px 60px rgba(0,0,0,0.4)',
        fontFamily: "'Kalam', cursive",
        animation: 'slideUp 0.25s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: '36px', height: '4px', background: c.border, borderRadius: '2px' }} />
        </div>

        {/* Color + Tag row */}
        <div style={{
          background: c.header, padding: '8px 16px 10px',
          borderBottom: `1px solid ${c.border}`,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {COLORS.map(col => (
              <button key={col.key} onClick={() => setColor(col.key)} style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: col.dot,
                border: color === col.key ? '2.5px solid #1e293b' : '2px solid transparent',
                cursor: 'pointer', transition: 'transform 0.15s',
                transform: color === col.key ? 'scale(1.3)' : 'scale(1)',
                flexShrink: 0,
              }} />
            ))}
          </div>
          <select
            value={tag}
            onChange={e => setTag(e.target.value)}
            style={{
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: '20px', padding: '4px 12px',
              fontSize: '0.78rem', color: c.text, cursor: 'pointer',
              fontFamily: "'Kalam', cursive", fontWeight: 600, outline: 'none',
            }}
          >
            {TAGS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        {/* Title */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Note title..."
          disabled={saving}
          style={{
            width: '100%', padding: '14px 16px 6px',
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: '1.1rem', fontWeight: 700, color: c.text,
            fontFamily: "'Kalam', cursive", boxSizing: 'border-box',
          }}
        />

        {/* Content */}
        <textarea
          ref={textRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write your note here..."
          rows={6}
          disabled={saving}
          style={{
            width: '100%', padding: '4px 16px 12px',
            border: 'none', outline: 'none', resize: 'none',
            background: 'transparent',
            fontSize: '0.92rem', color: c.text, lineHeight: 1.8,
            fontFamily: "'Kalam', cursive", boxSizing: 'border-box',
            flex: 1,
          }}
        />

        {/* Actions */}
        <div style={{
          padding: '10px 16px 20px',
          borderTop: `1px dashed ${c.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: '8px',
          background: c.header,
        }}>
          <button onClick={onClose} disabled={saving} style={{
            padding: '10px 20px', borderRadius: '10px',
            border: `1px solid ${c.border}`, background: 'transparent',
            color: c.text, cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '0.88rem', fontFamily: "'Kalam', cursive",
            opacity: saving ? 0.5 : 1,
          }}>
            <X size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '10px 24px', borderRadius: '10px',
            border: 'none', background: c.dot, color: 'white',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '0.88rem', fontFamily: "'Kalam', cursive", fontWeight: 700,
            boxShadow: `0 4px 14px ${c.dot}55`,
            display: 'flex', alignItems: 'center', gap: '6px',
            opacity: saving ? 0.8 : 1,
          }}>
            {saving
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Saving...</>
              : <><Check size={14} />Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FilterDrawer (mobile) ────────────────────────────────────────────────────
function FilterDrawer({ open, onClose, activeTag, setActiveTag, activeColor, setActiveColor, tagCounts }: {
  open: boolean;
  onClose: () => void;
  activeTag: string | null;
  setActiveTag: (t: string | null) => void;
  activeColor: NoteColor | null;
  setActiveColor: (c: NoteColor | null) => void;
  tagCounts: Record<string, number>;
}) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        />
      )}
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 160,
        width: '260px',
        background: 'linear-gradient(180deg, #0d2d2a 0%, #0f172a 100%)',
        borderRight: '1px solid rgba(20,184,166,0.15)',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column',
        padding: '0 0 2rem',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.1rem 1rem 0.8rem',
          borderBottom: '1px solid rgba(20,184,166,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Home size={14} color="white" />
            </div>
            <span style={{ fontWeight: 800, color: 'white', fontSize: '0.88rem' }}>HomeWallet</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.7)', padding: '4px' }}>
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Tags */}
        <div style={{ padding: '1rem 1rem 0.25rem' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(20,184,166,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tags</div>
          <button
            onClick={() => { setActiveTag(null); onClose(); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: !activeTag ? 'rgba(20,184,166,0.15)' : 'transparent',
              color: !activeTag ? '#14b8a6' : 'rgba(148,163,184,0.7)',
              fontSize: '0.8rem', fontWeight: !activeTag ? 700 : 500,
              marginBottom: '2px', transition: 'all 0.15s',
              fontFamily: "'Syne', sans-serif",
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Tag size={12} />All Tags</span>
          </button>
          {TAGS.map(t => (
            <button key={t} onClick={() => { setActiveTag(activeTag === t ? null : t); onClose(); }} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: activeTag === t ? 'rgba(20,184,166,0.15)' : 'transparent',
              color: activeTag === t ? '#14b8a6' : 'rgba(148,163,184,0.7)',
              fontSize: '0.8rem', fontWeight: activeTag === t ? 700 : 500,
              marginBottom: '2px', transition: 'all 0.15s',
              fontFamily: "'Syne', sans-serif",
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Tag size={12} />{t}</span>
              {tagCounts[t] > 0 && (
                <span style={{
                  background: activeTag === t ? '#14b8a6' : 'rgba(255,255,255,0.08)',
                  color: activeTag === t ? 'white' : 'rgba(148,163,184,0.5)',
                  borderRadius: '20px', fontSize: '0.6rem', padding: '1px 7px', fontWeight: 700,
                }}>{tagCounts[t]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Color filter */}
        <div style={{ padding: '1rem 1rem 0' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(20,184,166,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Color</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {COLORS.map(c => (
              <button key={c.key} onClick={() => { setActiveColor(activeColor === c.key ? null : c.key); onClose(); }} style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: c.dot,
                border: activeColor === c.key ? '3px solid white' : '2px solid transparent',
                cursor: 'pointer', transition: 'transform 0.15s',
                transform: activeColor === c.key ? 'scale(1.2)' : 'scale(1)',
              }} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── SidebarDesktop ───────────────────────────────────────────────────────────
function SidebarDesktop({ notes, activeTag, setActiveTag, activeColor, setActiveColor, tagCounts, onNewNote }: {
  notes: Note[];
  activeTag: string | null;
  setActiveTag: (t: string | null) => void;
  activeColor: NoteColor | null;
  setActiveColor: (c: NoteColor | null) => void;
  tagCounts: Record<string, number>;
  onNewNote: () => void;
}) {
  return (
    <aside style={{
      width: '220px', flexShrink: 0,
      background: 'linear-gradient(180deg, #0d2d2a 0%, #0f172a 100%)',
      borderRight: '1px solid rgba(20,184,166,0.12)',
      display: 'flex', flexDirection: 'column',
      padding: '0 0 1rem', overflowY: 'auto',
    }}>
      {/* Brand */}
      <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid rgba(20,184,166,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(20,184,166,0.3)',
          }}>
            <Home size={16} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>HomeWallet</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(20,184,166,0.7)', marginTop: '-1px' }}>Notes</div>
          </div>
        </div>
      </div>

      {/* New Note */}
      <div style={{ padding: '1rem 1rem 0.5rem' }}>
        <button onClick={onNewNote} style={{
          width: '100%', padding: '10px',
          background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
          border: 'none', borderRadius: '12px', color: 'white',
          fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          boxShadow: '0 4px 16px rgba(20,184,166,0.3)',
          fontFamily: "'Syne', sans-serif",
        }}>
          <Plus size={15} /> New Note
        </button>
      </div>

      {/* Stats */}
      <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '8px' }}>
        {[
          { label: 'Total', val: notes.length, color: '#14b8a6' },
          { label: 'Pinned', val: notes.filter(n => n.pinned).length, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
            padding: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.62rem', color: 'rgba(148,163,184,0.6)', marginTop: '1px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tags */}
      <div style={{ padding: '0.5rem 1rem 0.25rem' }}>
        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(20,184,166,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tags</div>
        {TAGS.map(t => (
          <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: activeTag === t ? 'rgba(20,184,166,0.15)' : 'transparent',
            color: activeTag === t ? '#14b8a6' : 'rgba(148,163,184,0.8)',
            fontSize: '0.78rem', fontWeight: activeTag === t ? 700 : 500,
            marginBottom: '2px', transition: 'all 0.15s', fontFamily: "'Syne', sans-serif",
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Tag size={11} />{t}</span>
            {tagCounts[t] > 0 && (
              <span style={{
                background: activeTag === t ? '#14b8a6' : 'rgba(255,255,255,0.08)',
                color: activeTag === t ? 'white' : 'rgba(148,163,184,0.5)',
                borderRadius: '20px', fontSize: '0.6rem', padding: '1px 6px', fontWeight: 700,
              }}>{tagCounts[t]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Color filter */}
      <div style={{ padding: '0.75rem 1rem 0' }}>
        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(20,184,166,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Color</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {COLORS.map(c => (
            <button key={c.key} onClick={() => setActiveColor(activeColor === c.key ? null : c.key)} style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: c.dot,
              border: activeColor === c.key ? '2px solid white' : '2px solid transparent',
              cursor: 'pointer', transition: 'transform 0.15s',
              transform: activeColor === c.key ? 'scale(1.2)' : 'scale(1)',
            }} />
          ))}
        </div>
      </div>
    </aside>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function NotesPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [notes, setNotes]             = useState<Note[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [search, setSearch]           = useState('');
  const [activeTag, setActiveTag]     = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState<NoteColor | null>(null);
  const [editing, setEditing]         = useState<Partial<Note> | null>(null);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [showSearch, setShowSearch]   = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    if (!user) return;
    setFetchLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNotes((data as NoteRow[]).map(rowToNote));
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load notes.');
    } finally {
      setFetchLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const saveNote = async (n: Omit<Note, 'createdAt'> & { createdAt?: Date }) => {
    if (!user) return;
    setGlobalError(null);
    setSaving(true);
    try {
      const isNew = !n.id;
      if (isNew) {
        const { data, error } = await supabase
          .from('notes')
          .insert({ user_id: user.id, title: n.title, content: n.content, color: n.color, pinned: n.pinned, tag: n.tag })
          .select().single();
        if (error) throw error;
        setNotes(prev => [rowToNote(data as NoteRow), ...prev]);
      } else {
        const { data, error } = await supabase
          .from('notes')
          .update({ title: n.title, content: n.content, color: n.color, tag: n.tag })
          .eq('id', n.id).eq('user_id', user.id)
          .select().single();
        if (error) throw error;
        setNotes(prev => prev.map(x => x.id === n.id ? rowToNote(data as NoteRow) : x));
      }
      setEditing(null);
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to save note.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteNote = async (id: string) => {
    if (!user) return;
    setGlobalError(null);
    setDeletingIds(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to delete note.');
    } finally {
      setDeletingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  // ── Toggle Pin ────────────────────────────────────────────────────────────
  const togglePin = async (id: string) => {
    if (!user) return;
    const note = notes.find(n => n.id === id);
    if (!note) return;
    setGlobalError(null);
    setTogglingIds(prev => new Set(prev).add(id));
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
    try {
      const { error } = await supabase.from('notes').update({ pinned: !note.pinned }).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    } catch (err: any) {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: note.pinned } : n));
      setGlobalError(err.message || 'Failed to update pin.');
    } finally {
      setTogglingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  // ── Filters ───────────────────────────────────────────────────────────────
  const filtered = notes.filter(n => {
    const ms = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
    const mt = !activeTag || n.tag === activeTag;
    const mc = !activeColor || n.color === activeColor;
    return ms && mt && mc;
  });

  const pinned   = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);
  const tagCounts = TAGS.reduce((acc, t) => ({ ...acc, [t]: notes.filter(n => n.tag === t).length }), {} as Record<string, number>);
  const hasActiveFilter = !!(activeTag || activeColor);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Syne:wght@600;800&display=swap');
        @keyframes slideUp { from { transform: translateY(60px); opacity:0; } to { transform: translateY(0); opacity:1; } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes pulse   { 0%,100%{ opacity:.35 } 50%{ opacity:.7 } }
        * { box-sizing: border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(20,184,166,0.25); border-radius: 3px; }
        input::placeholder, textarea::placeholder { color: rgba(0,0,0,0.3); }
      `}</style>

      <div style={{
        display: 'flex',
        height: '100dvh',          /* dynamic viewport height — fixes mobile browser chrome */
        background: '#0f172a',
        fontFamily: "'Syne', sans-serif",
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
        {!isMobile && (
          <SidebarDesktop
            notes={notes}
            activeTag={activeTag} setActiveTag={setActiveTag}
            activeColor={activeColor} setActiveColor={setActiveColor}
            tagCounts={tagCounts}
            onNewNote={() => setEditing({})}
          />
        )}

        {/* ── Mobile Filter Drawer ─────────────────────────────────────────── */}
        {isMobile && (
          <FilterDrawer
            open={drawerOpen} onClose={() => setDrawerOpen(false)}
            activeTag={activeTag} setActiveTag={setActiveTag}
            activeColor={activeColor} setActiveColor={setActiveColor}
            tagCounts={tagCounts}
          />
        )}

        {/* ── Main Area ───────────────────────────────────────────────────── */}
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>

          {/* ── Topbar ──────────────────────────────────────────────────────── */}
          <div style={{
            padding: isMobile ? '0.75rem 1rem' : '0.9rem 1.5rem',
            background: 'rgba(15,23,42,0.97)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(20,184,166,0.1)',
            display: 'flex', alignItems: 'center', gap: '10px',
            flexShrink: 0,
          }}>
            {/* Mobile: filter button */}
            {isMobile && (
              <button
                onClick={() => setDrawerOpen(true)}
                style={{
                  background: hasActiveFilter ? 'rgba(20,184,166,0.15)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${hasActiveFilter ? 'rgba(20,184,166,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '10px', padding: '8px',
                  color: hasActiveFilter ? '#14b8a6' : 'rgba(148,163,184,0.8)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0,
                }}
              >
                <Filter size={16} />
              </button>
            )}

            {/* Title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontSize: isMobile ? '1.1rem' : '1.35rem',
                fontWeight: 800, color: 'white',
                letterSpacing: '-0.03em',
                display: 'flex', alignItems: 'center', gap: '6px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                <StickyNote size={isMobile ? 16 : 20} style={{ color: '#14b8a6', flexShrink: 0 }} />
                My Notes
                {activeTag && (
                  <span style={{ fontSize: '0.78rem', color: '#14b8a6', fontWeight: 600 }}>· {activeTag}</span>
                )}
              </h1>
              {!isMobile && (
                <p style={{ fontSize: '0.72rem', color: 'rgba(100,116,139,0.8)', marginTop: '2px' }}>
                  {fetchLoading ? 'Loading...' : `${filtered.length} note${filtered.length !== 1 ? 's' : ''}${search ? ` matching "${search}"` : ''}`}
                </p>
              )}
            </div>

            {/* Mobile: expandable search */}
            {isMobile && showSearch ? (
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '6px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(100,116,139,0.7)' }} />
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search..."
                    style={{
                      width: '100%', paddingLeft: '28px', paddingRight: '8px',
                      paddingTop: '8px', paddingBottom: '8px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '10px', color: 'white',
                      fontSize: '0.85rem', outline: 'none',
                      fontFamily: "'Syne', sans-serif",
                    }}
                  />
                </div>
                <button onClick={() => { setShowSearch(false); setSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.7)', padding: '4px' }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                {/* Desktop search */}
                {!isMobile && (
                  <div style={{ position: 'relative' }}>
                    <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(100,116,139,0.7)' }} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search notes..."
                      style={{
                        paddingLeft: '30px', paddingRight: search ? '30px' : '12px',
                        paddingTop: '8px', paddingBottom: '8px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px', color: 'white',
                        fontSize: '0.82rem', outline: 'none', width: '190px',
                        fontFamily: "'Syne', sans-serif",
                      }}
                    />
                    {search && (
                      <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(100,116,139,0.7)', padding: 0 }}>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}

                {/* Mobile search icon */}
                {isMobile && (
                  <button onClick={() => setShowSearch(true)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px', color: 'rgba(148,163,184,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Search size={16} />
                  </button>
                )}

                {/* Refresh */}
                <button onClick={fetchNotes} disabled={fetchLoading} title="Refresh" style={{ padding: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(148,163,184,0.8)', cursor: fetchLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <RefreshCw size={15} style={fetchLoading ? { animation: 'spin 1s linear infinite' } : {}} />
                </button>

                {/* Add (desktop) */}
                {!isMobile && (
                  <button onClick={() => setEditing({})} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #0d9488, #14b8a6)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 12px rgba(20,184,166,0.3)', fontFamily: "'Syne', sans-serif", flexShrink: 0 }}>
                    <Plus size={14} /> Add
                  </button>
                )}
              </>
            )}
          </div>

          {/* Mobile active filter chip */}
          {isMobile && hasActiveFilter && (
            <div style={{ padding: '8px 1rem 0', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {activeTag && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.72rem', color: '#14b8a6', fontWeight: 600 }}>
                  {activeTag}
                  <button onClick={() => setActiveTag(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#14b8a6', padding: '0 0 0 2px', display: 'flex' }}><X size={11} /></button>
                </span>
              )}
              {activeColor && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.72rem', color: '#14b8a6', fontWeight: 600 }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS.find(c => c.key === activeColor)?.dot, display: 'inline-block' }} />
                  {activeColor}
                  <button onClick={() => setActiveColor(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#14b8a6', padding: '0 0 0 2px', display: 'flex' }}><X size={11} /></button>
                </span>
              )}
            </div>
          )}

          {/* Global error */}
          {globalError && (
            <div style={{ margin: '0.75rem 1rem 0', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#f87171' }}>
                <AlertCircle size={13} />{globalError}
              </span>
              <button onClick={() => setGlobalError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 0 }}><X size={13} /></button>
            </div>
          )}

          {/* ── Scrollable Board ─────────────────────────────────────────────── */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: isMobile ? '1rem' : '1.25rem 1.5rem',
            // extra bottom padding on mobile so FAB doesn't overlap last card
            paddingBottom: isMobile ? '90px' : '1.5rem',
            WebkitOverflowScrolling: 'touch',
          }}>

            {/* Skeleton */}
            {fetchLoading && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ height: `${140 + (i % 3) * 36}px`, background: 'rgba(255,255,255,0.04)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease infinite', animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}

            {/* Fetch error */}
            {!fetchLoading && fetchError && (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <AlertCircle size={40} color="rgba(239,68,68,0.4)" style={{ marginBottom: '1rem' }} />
                <p style={{ color: '#f87171', fontSize: '0.9rem', marginBottom: '1rem' }}>{fetchError}</p>
                <button onClick={fetchNotes} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #0d9488, #14b8a6)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', fontFamily: "'Syne', sans-serif", display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={14} /> Retry
                </button>
              </div>
            )}

            {/* Notes */}
            {!fetchLoading && !fetchError && (
              <>
                {/* Pinned section */}
                {pinned.length > 0 && (
                  <div style={{ marginBottom: '1.25rem', animation: 'fadeUp 0.35s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '0.75rem' }}>
                      <Star size={12} color="#f59e0b" fill="#f59e0b" />
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(245,158,11,0.85)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Pinned</span>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(245,158,11,0.12)' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.75rem' }}>
                      {pinned.map(n => (
                        <NoteCard key={n.id} note={n} onEdit={setEditing} onDelete={deleteNote} onTogglePin={togglePin} deleting={deletingIds.has(n.id)} toggling={togglingIds.has(n.id)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Others section */}
                {unpinned.length > 0 && (
                  <div style={{ animation: 'fadeUp 0.4s ease 0.08s both' }}>
                    {pinned.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(100,116,139,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Others</span>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.75rem' }}>
                      {unpinned.map(n => (
                        <NoteCard key={n.id} note={n} onEdit={setEditing} onDelete={deleteNote} onTogglePin={togglePin} deleting={deletingIds.has(n.id)} toggling={togglingIds.has(n.id)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {filtered.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem 1.5rem', animation: 'fadeUp 0.35s ease' }}>
                    <StickyNote size={44} color="rgba(20,184,166,0.18)" style={{ marginBottom: '0.75rem' }} />
                    <p style={{ color: 'rgba(100,116,139,0.6)', fontSize: '0.88rem', marginBottom: '1rem' }}>
                      {search || activeTag ? 'No notes match your filter.' : 'No notes yet. Tap + to create one!'}
                    </p>
                    {!search && !activeTag && (
                      <button onClick={() => setEditing({})} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #0d9488, #14b8a6)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', fontFamily: "'Syne', sans-serif" }}>
                        <Plus size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Create Note
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Mobile FAB ──────────────────────────────────────────────────── */}
          {isMobile && (
            <button
              onClick={() => setEditing({})}
              style={{
                position: 'fixed',
                bottom: '24px',
                right: '20px',
                zIndex: 100,
                width: '56px', height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
                border: 'none',
                boxShadow: '0 6px 24px rgba(20,184,166,0.45), 0 2px 8px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s',
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.93)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.93)')}
              onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Plus size={26} color="white" strokeWidth={2.5} />
            </button>
          )}
        </main>
      </div>

      {/* Modal */}
      {editing !== null && (
        <NoteModal
          note={editing}
          onSave={saveNote}
          onClose={() => !saving && setEditing(null)}
          saving={saving}
        />
      )}
    </>
  );
}