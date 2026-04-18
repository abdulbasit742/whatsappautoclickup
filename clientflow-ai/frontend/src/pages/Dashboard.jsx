import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Users, TrendingUp, Star, AlertTriangle, Send, X, Activity, Flame, DollarSign, Target } from 'lucide-react';
import api from '../utils/api';
import StatCard from '../components/StatCard';
import { useToast } from '../components/Toast';

const ALERT_COLORS = {
  unresolved_query: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
  pending_payment:  'bg-blue-500/20 text-blue-400 border-blue-500/20',
  new_client:       'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
  ai_failure:       'bg-red-500/20 text-red-400 border-red-500/20',
  complaint:        'bg-red-500/20 text-red-400 border-red-500/20',
  inactive_client:  'bg-gray-500/20 text-gray-400 border-gray-500/20',
};

const PRIORITY_BADGE = {
  high:   'bg-red-500/20 text-red-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low:    'bg-gray-500/20 text-gray-400',
};

export default function Dashboard() {
  const toast = useToast();
  const [stats, setStats]           = useState({});
  const [alerts, setAlerts]         = useState([]);
  const [funnel, setFunnel]         = useState(null);
  const [hotLeads, setHotLeads]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [replyAlert, setReplyAlert] = useState(null);
  const [replyMsg, setReplyMsg]     = useState('');
  const [sending, setSending]       = useState(false);
  const [aiHealth, setAiHealth]     = useState(null);

  const refresh = useCallback(() => Promise.all([
    api.get('/analytics/dashboard').then(r => setStats(r.data)),
    api.get('/alerts').then(r => setAlerts(r.data)),
    api.get('/analytics/funnel').then(r => setFunnel(r.data)),
    api.get('/analytics/hot-leads').then(r => setHotLeads(r.data)).catch(() => {}),
  ]), []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    api.get('/ai/health').then(r => setAiHealth(r.data)).catch(() => {});

    const socket = io('', { path: '/socket.io' });
    socket.on('new_alert', () => refresh());
    socket.on('alert_resolved', ({ alertId }) => {
      setAlerts(a => a.filter(x => x.id !== alertId));
    });
    socket.on('alerts_bulk_resolved', () => refresh());
    return () => socket.disconnect();
  }, [refresh]);

  const resolveAlert = async id => {
    try {
      await api.put(`/alerts/${id}/resolve`);
      setAlerts(a => a.filter(x => x.id !== id));
      setStats(s => ({ ...s, unresolvedAlerts: Math.max(0, (s.unresolvedAlerts || 1) - 1) }));
    } catch (e) {
      console.error('Failed to resolve alert:', e.message);
    }
  };

  const sendQuickReply = async () => {
    if (!replyMsg.trim() || !replyAlert) return;
    setSending(true);
    try {
      await api.post(`/clients/${replyAlert.client_id}/send`, { message: replyMsg });
      await resolveAlert(replyAlert.id);
      setReplyAlert(null);
      setReplyMsg('');
    } catch (e) {
      toast('Failed: ' + (e.response?.data?.error || e.message), 'error');
    } finally { setSending(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading dashboard...
      </div>
    </div>
  );

  const funnelConversion = funnel && funnel.total > 0
    ? ((funnel.paid / funnel.total) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Dashboard</h2>
        <button
          onClick={() => refresh()}
          className="text-xs text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Clients"  value={stats.totalClients}  icon={Users}         color="emerald" sub={`+${stats.newThisWeek ?? 0} this week`} />
        <StatCard title="Revenue (30d)"  value={`PKR ${(stats.revenueMonth || 0).toLocaleString()}`} icon={TrendingUp} color="blue" sub={`Today: PKR ${(stats.revenueToday || 0).toLocaleString()}`} />
        <StatCard title="Avg Rating"     value={`${stats.avgRating ?? '0.0'} ⭐`}         icon={Star}          color="yellow" />
        <StatCard title="Open Alerts"    value={stats.unresolvedAlerts ?? 0}               icon={AlertTriangle} color="red" sub={`${stats.pendingPayments ?? 0} pending payments`} />
      </div>

      {/* Revenue Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Today', value: stats.revenueToday || 0, color: 'text-emerald-400' },
          { label: 'This Week', value: stats.revenueWeek || 0, color: 'text-blue-400' },
          { label: 'This Month', value: stats.revenueMonth || 0, color: 'text-purple-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={14} className="text-gray-500" />
              <p className="text-xs text-gray-500">Revenue {label}</p>
            </div>
            <p className={`text-lg font-bold ${color}`}>PKR {Number(value).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-3 text-white flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400" /> Live Alerts
            </h3>
            <div className="space-y-2">
              {alerts.length === 0 && (
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-6 text-center text-gray-500 text-sm">
                  No open alerts 🎉
                </div>
              )}
              {alerts.map(a => (
                <div key={a.id} className={`bg-[#1a1a1a] border rounded-xl px-4 py-3 ${a.priority === 'high' ? 'border-red-500/30' : 'border-[#2a2a2a]'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ALERT_COLORS[a.type] || 'bg-gray-500/20 text-gray-400'}`}>
                          {a.type.replace(/_/g, ' ')}
                        </span>
                        {a.priority && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${PRIORITY_BADGE[a.priority]}`}>
                            {a.priority}
                          </span>
                        )}
                        <span className="text-sm text-white font-medium truncate">{a.name || a.whatsapp_number}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{a.message}</p>
                    </div>
                    <div className="flex gap-2 ml-3 shrink-0">
                      {a.client_id && (
                        <button
                          onClick={() => { setReplyAlert(a); setReplyMsg(''); }}
                          className="text-xs text-blue-400 hover:text-blue-300 border border-blue-400/20 px-2 py-1 rounded-lg transition-colors"
                          title="Quick reply"
                        >
                          <Send size={11} />
                        </button>
                      )}
                      <button
                        onClick={() => resolveAlert(a.id)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-400/20 px-2 py-1 rounded-lg transition-colors"
                      >
                        ✓ Done
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conversion Funnel */}
          {funnel && (
            <div>
              <h3 className="text-sm font-semibold mb-3 text-white flex items-center gap-2">
                <Target size={14} className="text-blue-400" /> Conversion Funnel
              </h3>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <div className="flex items-end gap-2 mb-3">
                  {[
                    { label: 'Total', value: funnel.total, color: 'bg-gray-500' },
                    { label: 'Leads', value: funnel.leads, color: 'bg-yellow-500' },
                    { label: 'Active', value: funnel.active, color: 'bg-blue-500' },
                    { label: 'Paid', value: funnel.paid, color: 'bg-emerald-500' },
                    { label: 'Repeat', value: funnel.repeat, color: 'bg-purple-500' },
                  ].map(({ label, value, color }) => {
                    const pct = funnel.total > 0 ? Math.max(8, (value / funnel.total) * 100) : 8;
                    return (
                      <div key={label} className="flex-1 text-center">
                        <div
                          className={`${color} rounded-t-md mx-auto`}
                          style={{ height: `${pct}px`, minHeight: '8px' }}
                        />
                        <p className="text-xs text-white font-bold mt-1">{value}</p>
                        <p className="text-xs text-gray-500">{label}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#2a2a2a]">
                  <span className="text-xs text-gray-500">Conversion Rate</span>
                  <span className="text-sm font-bold text-emerald-400">{funnelConversion}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Hot Leads */}
          {hotLeads.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 text-white flex items-center gap-2">
                <Flame size={14} className="text-orange-400" /> Hot Leads
              </h3>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl divide-y divide-[#2a2a2a]">
                {hotLeads.slice(0, 5).map(l => (
                  <div key={l.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{l.name || l.whatsapp_number}</p>
                      <p className="text-xs text-gray-500">{l.message_count} messages today</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 shrink-0 ml-2">
                      🔥 Hot
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Health Panel */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-white flex items-center gap-2">
              <Activity size={14} className="text-emerald-400" /> AI Provider Status
            </h3>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
              {aiHealth ? Object.entries(aiHealth).map(([name, info]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 capitalize">{name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${info.available ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {info.available ? '● Online' : '● Offline'}
                  </span>
                </div>
              )) : (
                <p className="text-xs text-gray-500">Loading AI status...</p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <h4 className="text-xs font-semibold text-gray-400 mb-3">Overview</h4>
            <div className="space-y-2">
              {[
                { label: 'Active Clients',    value: stats.activeClients ?? 0,    color: 'text-white' },
                { label: 'Pending Payments',  value: stats.pendingPayments ?? 0,  color: 'text-yellow-400' },
                { label: 'New This Week',     value: stats.newThisWeek ?? 0,      color: 'text-emerald-400' },
                { label: 'Hot Leads Today',   value: stats.hotLeads ?? 0,         color: 'text-orange-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-400">{label}</span>
                  <span className={`font-medium ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reply Modal */}
      {replyAlert && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Quick Reply</h3>
              <button onClick={() => setReplyAlert(null)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Replying to: <span className="text-white">{replyAlert.name || replyAlert.whatsapp_number}</span>
            </p>
            <p className="text-xs text-gray-500 mb-3 bg-[#2a2a2a] px-3 py-2 rounded-lg">"{replyAlert.message}"</p>
            <textarea
              value={replyMsg}
              onChange={e => setReplyMsg(e.target.value)}
              rows={4}
              placeholder="Type your reply..."
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setReplyAlert(null)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button
                onClick={sendQuickReply}
                disabled={sending}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Send size={14}/> {sending ? 'Sending...' : 'Send & Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
