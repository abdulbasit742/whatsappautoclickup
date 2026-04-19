import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { format } from 'date-fns';
import {
  Users, Flame, Clock, AlertTriangle, DollarSign,
  Megaphone, Brain, TrendingUp, Send, X, Activity, CheckCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import StatCard from '../components/StatCard';
import api from '../utils/api';

const CHART_TOOLTIP = {
  contentStyle: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 11 },
};

const mockRevenue = [
  { day: 'Mon', revenue: 42000 }, { day: 'Tue', revenue: 58000 },
  { day: 'Wed', revenue: 45000 }, { day: 'Thu', revenue: 71000 },
  { day: 'Fri', revenue: 89000 }, { day: 'Sat', revenue: 63000 },
  { day: 'Sun', revenue: 88000 },
];

const ACTIVITY_COLORS = {
  emerald: 'w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0',
  blue:    'w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0',
  purple:  'w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400 shrink-0',
  yellow:  'w-7 h-7 rounded-full bg-yellow-500/20 flex items-center justify-center text-xs font-bold text-yellow-400 shrink-0',
};

const mockActivity = [
  { id: 1, initials: 'AB', name: 'Abdul Basit',  action: 'Closed deal with Sara Ahmed',          time: '2m ago',  color: 'emerald' },
  { id: 2, initials: 'ZK', name: 'Zara Khan',    action: 'Sent follow-up to 12 clients',          time: '15m ago', color: 'blue' },
  { id: 3, initials: '🤖', name: 'AI Bot',       action: 'Auto-replied to 8 WhatsApp messages',   time: '32m ago', color: 'purple' },
  { id: 4, initials: 'HA', name: 'Hassan Ali',   action: 'Scheduled 3 appointments',              time: '1h ago',  color: 'yellow' },
  { id: 5, initials: 'MC', name: 'Mia Chen',     action: 'Collected payment PKR 45,000',          time: '2h ago',  color: 'emerald' },
];

const mockRecs = [
  { id: 1, title: 'Re-engage 12 cold leads',   desc: "Haven't responded in 7+ days. Send targeted campaign.", color: 'yellow',  Icon: Flame },
  { id: 2, title: 'Follow up 5 hot leads',     desc: 'High-intent signals. Act before they go cold.',          color: 'emerald', Icon: TrendingUp },
  { id: 3, title: '3 overdue payments',        desc: 'Send automated reminders to reduce outstanding balance.', color: 'red',     Icon: AlertTriangle },
];

const mockCampaigns = [
  { name: 'Summer Sale',    sent: 450, replies: 89,  rate: 78 },
  { name: 'Re-engagement',  sent: 200, replies: 34,  rate: 56 },
  { name: 'Welcome Series', sent: 120, replies: 98,  rate: 92 },
];

const DEFAULT_ALERTS = [
  { id: 'a1', type: 'warning', msg: "Hot lead Ali Hassan hasn't been contacted in 3 days" },
  { id: 'a2', type: 'danger',  msg: 'Payment overdue: Sarah Khan — PKR 25,000' },
  { id: 'a3', type: 'warning', msg: 'Campaign "Summer Sale" delivery dropped to 62%' },
  { id: 'a4', type: 'success', msg: 'New 5★ review from Fatima Malik' },
  { id: 'a5', type: 'info',    msg: 'AI response rate: 98.7% in last 24 h' },
];

const ALERT_STYLE = {
  warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  danger:  'bg-red-500/10 border-red-500/20 text-red-400',
  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  info:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
};

const REC_COLOR = {
  yellow:  'text-yellow-400 bg-yellow-400/10',
  emerald: 'text-emerald-400 bg-emerald-400/10',
  red:     'text-red-400 bg-red-400/10',
};

const MOCK_STATS = {
  totalLeads: 248, activeClients: 89, hotLeads: 34,
  pendingFollowups: 17, unresolvedAlerts: 8,
  revenueMonth: 456000, campaignsRunning: 5, aiRequestsToday: 342,
};

export default function Dashboard() {
  const [stats,     setStats]     = useState(MOCK_STATS);
  const [alerts,    setAlerts]    = useState([]);
  const [aiHealth,  setAiHealth]  = useState(null);
  const [revenue,   setRevenue]   = useState(mockRevenue);
  const [loading,   setLoading]   = useState(true);
  const [replyAlert, setReplyAlert] = useState(null);
  const [replyMsg,  setReplyMsg]  = useState('');
  const [sending,   setSending]   = useState(false);

  const refresh = () => Promise.all([
    api.get('/analytics/dashboard').then(r => setStats(s => ({ ...s, ...r.data }))).catch(() => {}),
    api.get('/alerts').then(r => setAlerts(r.data)).catch(() => setAlerts(DEFAULT_ALERTS)),
  ]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    api.get('/ai/health').then(r => setAiHealth(r.data)).catch(() => {});
    api.get('/payments/revenue').then(r => {
      if (r.data?.length) setRevenue(r.data.map(d => ({ day: format(new Date(d.date), 'EEE'), revenue: parseFloat(d.total) })));
    }).catch(() => {});

    const socket = io('', { path: '/socket.io' });
    socket.on('new_alert', () => refresh());
    return () => socket.disconnect();
  }, []);

  const resolveAlert = async id => {
    try { await api.put(`/alerts/${id}/resolve`); } catch {}
    setAlerts(a => a.filter(x => x.id !== id));
  };

  const sendQuickReply = async () => {
    if (!replyMsg.trim() || !replyAlert) return;
    setSending(true);
    try {
      await api.post(`/clients/${replyAlert.client_id}/send`, { message: replyMsg });
      await resolveAlert(replyAlert.id);
      setReplyAlert(null); setReplyMsg('');
    } catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)); }
    finally { setSending(false); }
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading dashboard…</div>;

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Leads"       value={stats.totalLeads ?? stats.totalClients ?? 0} icon={Users}          color="emerald" sub="all pipeline stages" />
        <StatCard title="Active Clients"    value={stats.activeClients  ?? 0}                   icon={CheckCircle}    color="blue"    sub="engaged this week" />
        <StatCard title="Hot Leads"         value={stats.hotLeads       ?? 0}                   icon={Flame}          color="red"     sub="high-intent prospects" />
        <StatCard title="Pending Follow-ups" value={stats.pendingFollowups ?? 0}                icon={Clock}          color="yellow"  sub="due today" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Unresolved Issues"  value={stats.unresolvedAlerts ?? 0}                icon={AlertTriangle}  color="red"     />
        <StatCard title="Revenue (30 days)"  value={`PKR ${(stats.revenueMonth || 0).toLocaleString()}`} icon={DollarSign} color="emerald" />
        <StatCard title="Campaigns Running" value={stats.campaignsRunning ?? 0}                icon={Megaphone}      color="purple"  />
        <StatCard title="AI Requests Today" value={stats.aiRequestsToday ?? 0}                 icon={Brain}          color="blue"    sub="via Groq" />
      </div>

      {/* ── Revenue chart + Team activity ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Revenue This Week</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={revenue}>
              <defs>
                <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip {...CHART_TOOLTIP} formatter={v => [`PKR ${Number(v).toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revG)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Team activity */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={14} className="text-emerald-400" /> Team Activity
          </h3>
          <div className="space-y-3">
            {mockActivity.map(a => (
              <div key={a.id} className="flex items-start gap-3">
                <div className={ACTIVITY_COLORS[a.color] || ACTIVITY_COLORS.emerald}>
                  {a.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white font-medium truncate">{a.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{a.action}</p>
                </div>
                <span className="text-[10px] text-gray-600 shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI Recommendations + Campaign Performance + Live Alerts ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Recommendations */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Brain size={14} className="text-purple-400" /> AI Recommendations
          </h3>
          <div className="space-y-3">
            {mockRecs.map(r => (
              <div key={r.id} className="flex items-start gap-3 p-3 bg-[#0f0f0f] rounded-lg border border-[#2a2a2a]">
                <div className={`p-1.5 rounded-lg shrink-0 ${REC_COLOR[r.color]}`}>
                  <r.Icon size={13} />
                </div>
                <div>
                  <p className="text-xs font-medium text-white">{r.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign Performance */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Megaphone size={14} className="text-blue-400" /> Campaign Performance
          </h3>
          <div className="space-y-4">
            {mockCampaigns.map(c => (
              <div key={c.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300 font-medium">{c.name}</span>
                  <span className="text-gray-500">{c.replies}/{c.sent} replies</span>
                </div>
                <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${c.rate}%` }} />
                </div>
                <p className="text-[10px] text-gray-600 mt-0.5">{c.rate}% delivery rate</p>
              </div>
            ))}
          </div>
        </div>

        {/* Live Alerts */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={14} className="text-yellow-400" /> Live Alerts
          </h3>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {alerts.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">No open alerts 🎉</p>
            )}
            {alerts.map(a => (
              <div key={a.id} className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${ALERT_STYLE[a.type] || ALERT_STYLE.info}`}>
                <p className="flex-1 leading-relaxed">{a.msg || a.message || ''}</p>
                <button onClick={() => resolveAlert(a.id)} className="shrink-0 opacity-70 hover:opacity-100">✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Provider Status */}
      {aiHealth && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">AI Provider Status</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(aiHealth).map(([name, info]) => (
              <div key={name} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${info.available ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-sm text-gray-300 capitalize">{name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${info.available ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {info.available ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Reply Modal */}
      {replyAlert && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Quick Reply</h3>
              <button onClick={() => setReplyAlert(null)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-3 bg-[#2a2a2a] px-3 py-2 rounded-lg">"{replyAlert.msg || replyAlert.message}"</p>
            <textarea
              value={replyMsg} onChange={e => setReplyMsg(e.target.value)} rows={4}
              placeholder="Type your reply…"
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setReplyAlert(null)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={sendQuickReply} disabled={sending}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Send size={14} /> {sending ? 'Sending…' : 'Send & Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
