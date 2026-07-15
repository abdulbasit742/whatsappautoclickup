import { useState, useEffect } from 'react';
import { Bell, BellDot, ChevronRight, Check } from 'lucide-react';
import api from '../utils/api';

const USER_ID = 'demo-user';

export default function ReleaseNotes() {
  const [notes, setNotes] = useState([]);
  const [unread, setUnread] = useState(0);
  const [expanded, setExpanded] = useState(null);

  async function load() {
    try {
      const [n, u] = await Promise.all([
        api.get(`/release-notes?user_id=${USER_ID}`).then(r => r.data),
        api.get(`/release-notes/unread-count?user_id=${USER_ID}`).then(r => r.data.unread),
      ]);
      setNotes(n);
      setUnread(u);
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function markRead(id) {
    try {
      await api.post(`/release-notes/${id}/read`, { user_id: USER_ID });
      setNotes(prev => prev.map(n => n.id===id ? { ...n, is_read: true } : n));
      setUnread(u => Math.max(0, u-1));
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.post('/release-notes/read-all', { user_id: USER_ID });
      setNotes(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {}
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          {unread > 0 ? <BellDot size={22} className="text-emerald-400" /> : <Bell size={22} className="text-gray-400" />}
          Release Notes
          {unread > 0 && <span className="text-sm bg-emerald-500 text-white rounded-full px-2 py-0.5">{unread} new</span>}
        </h1>
        {unread > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
            <Check size={14} /> Mark all read
          </button>
        )}
      </div>

      {notes.length === 0 && <p className="text-gray-500 text-sm">No release notes yet.</p>}

      <div className="space-y-3">
        {notes.map(note => (
          <div key={note.id} className={`bg-[#1a1a1a] border rounded-xl overflow-hidden transition-colors ${!note.is_read ? 'border-emerald-500/30' : 'border-[#2a2a2a]'}`}>
            <button
              onClick={() => { setExpanded(expanded===note.id ? null : note.id); if(!note.is_read) markRead(note.id); }}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {!note.is_read && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
                <div>
                  <div className="text-sm text-emerald-400 font-mono">v{note.version}</div>
                  <div className="text-white font-medium text-sm">{note.title}</div>
                  <div className="text-xs text-gray-500">{new Date(note.published_at).toLocaleDateString()}</div>
                </div>
              </div>
              <ChevronRight size={14} className={`text-gray-400 transition-transform ${expanded===note.id ? 'rotate-90' : ''}`} />
            </button>
            {expanded === note.id && (
              <div className="px-5 pb-5 border-t border-[#2a2a2a]">
                {(JSON.parse(note.highlights || '[]')).length > 0 && (
                  <div className="mt-4 mb-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Highlights</div>
                    <ul className="space-y-1">
                      {JSON.parse(note.highlights||'[]').map((h,i) => (
                        <li key={i} className="text-sm text-white flex items-center gap-2"><span className="text-emerald-400">✦</span> {h}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap mt-3">{note.body}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
