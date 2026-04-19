import { useEffect, useState, useRef } from 'react';
import { Activity, Users, MessageSquare, CreditCard, Zap, AlertCircle, TrendingUp, RefreshCw, Filter } from 'lucide-react';
import api from '../utils/api';
import { io } from 'socket.io-client';

const TYPE_CONFIG = {
  new_lead:       { icon: Users,         color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  message:        { icon: MessageSquare, color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  payment:        { icon: CreditCard,    color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  campaign:       { icon: Zap,           color: 'text-purple-400', bg: 'bg-purple-400/10' },
  issue:          { icon: AlertCircle,   color: 'text-red-400',    bg: 'bg-red-400/10' },
  ai_action:      { icon: Zap,           color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  rule_action:    { icon: TrendingUp,    color: 'text-orange-400', bg: 'bg-orange-400/10' },
};

const DEFAULT_ICON = { icon: Activity, color: 'text-gray-400', bg: 'bg-gray-400/10' };

export default function ActivityFeed() {
  const [events, setEvents]   = useState([]);
  const [types, setTypes]     = useState([]);
  const [filter, setFilter]   = useState('');
  const [loading, setLoading] = useState(false);
  const [live, setLive]       = useState(true);
  const socketRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/activity', { params: { type: filter || undefined, limit: 60 } });
      setEvents(r.data);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/activity/types').then(r => setTypes(r.data));
  }, []);

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    if (!live) {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      return;
    }
    const socket = io(window.location.origin.replace('5173', '5000'));
    socketRef.current = socket;
    socket.on('activity', (event) => {
      setEvents(prev => [event, ...prev].slice(0, 100));
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [live]);

  const timeAgo = (dt) => {
    const diff = Date.now() - new Date(dt);
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Activity Feed</h2>
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${live ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
            {live ? 'Live' : 'Paused'}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setLive(v => !v)} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${live ? 'border-emerald-500/30 text-emerald-400' : 'border-[#2a2a2a] text-gray-400 hover:text-white'}`}>
            {live ? 'Pause' : 'Go Live'}
          </button>
          <button onClick={load} className="flex items-center gap-2 text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilter('')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === '' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'}`}
        >
          <Filter size={12} /> All Events
        </button>
        {types.map(t => {
          const cfg = TYPE_CONFIG[t] || DEFAULT_ICON;
          const Icon = cfg.icon;
          return (
            <button
              key={t}
              onClick={() => setFilter(t === filter ? '' : t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === t ? `${cfg.bg} ${cfg.color} border border-current/20` : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'}`}
            >
              <Icon size={12} /> {t.replace(/_/g, ' ')}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading...</div>
      ) : events.length === 0 ? (
        <div className="text-center text-gray-500 py-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
          <Activity size={32} className="mx-auto mb-3 opacity-30" />
          <p>No activity yet. Events will appear here in real-time.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(ev => {
            const cfg = TYPE_CONFIG[ev.type] || DEFAULT_ICON;
            const Icon = cfg.icon;
            return (
              <div key={ev.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-start gap-4 hover:border-[#3a3a3a] transition-colors">
                <div className={`p-2 rounded-lg shrink-0 ${cfg.bg}`}>
                  <Icon size={16} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white text-sm font-medium">{ev.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{ev.type}</span>
                  </div>
                  {ev.detail && <p className="text-xs text-gray-400 truncate">{ev.detail}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    {ev.actor_name && <span className="text-xs text-gray-500">by {ev.actor_name}</span>}
                    <span className="text-xs text-gray-600">{timeAgo(ev.created_at)}</span>
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
