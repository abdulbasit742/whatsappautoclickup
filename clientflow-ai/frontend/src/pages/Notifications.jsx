import { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Filter } from 'lucide-react';
import api from '../utils/api';

const TYPE_COLORS = {
  new_message:      'bg-blue-500/20 text-blue-400',
  issue_breach:     'bg-red-500/20 text-red-400',
  followup_due:     'bg-orange-500/20 text-orange-400',
  payment_reminder: 'bg-yellow-500/20 text-yellow-400',
  ai_failure:       'bg-purple-500/20 text-purple-400',
  integration_error:'bg-pink-500/20 text-pink-400',
  campaign_completed:'bg-emerald-500/20 text-emerald-400',
};

export default function Notifications() {
  const [items, setItems]   = useState([]);
  const [count, setCount]   = useState(0);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const unread = filter === 'unread';
    const r = await api.get(`/notifications${unread ? '?unread_only=true' : ''}`);
    setItems(r.data);
    const c = await api.get('/notifications/count');
    setCount(c.data.count);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, [filter]);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    setItems(i => i.map(x => x.id === id ? { ...x, is_read: true } : x));
    setCount(c => Math.max(0, c - 1));
  };

  const markAll = async () => {
    await api.put('/notifications/read-all');
    setItems(i => i.map(x => ({ ...x, is_read: true })));
    setCount(0);
  };

  if (loading) return <div className="text-gray-400">Loading notifications...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell size={20} className="text-yellow-400" /> Notifications
          {count > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{count}</span>}
        </h2>
        <div className="flex gap-2">
          {['all','unread'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize ${filter === f ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
              {f}
            </button>
          ))}
          {count > 0 && (
            <button onClick={markAll} className="flex items-center gap-1 px-3 py-1.5 bg-[#1a1a1a] text-gray-400 hover:text-white rounded-lg text-sm">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {items.map(n => (
          <div key={n.id} className={`flex items-start gap-3 p-4 rounded-xl border ${n.is_read ? 'bg-[#111] border-[#1a1a1a]' : 'bg-[#1a1a1a] border-[#2a2a2a]'}`}>
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${TYPE_COLORS[n.type] || 'bg-gray-500/20 text-gray-400'}`}>
              {n.type?.replace(/_/g,' ')}
            </span>
            <div className="flex-1">
              <p className={`text-sm font-medium ${n.is_read ? 'text-gray-400' : 'text-white'}`}>{n.title}</p>
              {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
              <p className="text-xs text-gray-600 mt-1">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            {!n.is_read && (
              <button onClick={() => markRead(n.id)} className="text-emerald-400 hover:text-emerald-300 shrink-0">
                <Check size={14} />
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <div className="text-center text-gray-500 py-12">No notifications.</div>}
      </div>
    </div>
  );
}
