import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Users, TrendingUp, Star, AlertTriangle, Send, X, Activity, Flame, Clock3, Wallet, Megaphone, Bot } from 'lucide-react';
import api from '../utils/api';
import StatCard from '../components/StatCard';

const ALERT_COLORS = {
  unresolved_query: 'bg-yellow-500/20 text-yellow-400',
  pending_payment:  'bg-blue-500/20 text-blue-400',
  new_client:       'bg-emerald-500/20 text-emerald-400',
  ai_error:         'bg-red-500/20 text-red-400',
};

export default function Dashboard() {
  const [stats, setStats]       = useState({});
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [replyAlert, setReplyAlert] = useState(null);
  const [replyMsg, setReplyMsg] = useState('');
  const [sending, setSending]   = useState(false);
  const [aiHealth, setAiHealth] = useState(null);

  const refresh = () => Promise.all([
    api.get('/analytics/dashboard').then(r => setStats(r.data)),
    api.get('/alerts').then(r => setAlerts(r.data)),
  ]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    api.get('/ai/health').then(r => setAiHealth(r.data)).catch(() => {});

    const socket = io('', { path: '/socket.io' });
    socket.on('new_alert', () => refresh());
    return () => socket.disconnect();
  }, []);

  const resolveAlert = async id => {
    await api.put(`/alerts/${id}/resolve`);
    setAlerts(a => a.filter(x => x.id !== id));
    setStats(s => ({ ...s, unresolvedAlerts: Math.max(0, (s.unresolvedAlerts || 1) - 1) }));
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
      alert('Failed: ' + (e.response?.data?.error || e.message));
    } finally { setSending(false); }
  };

  if (loading) return <div className="text-gray-400">Loading dashboard...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-white">Executive CRM Dashboard</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatCard title="Total Leads"  value={stats.totalLeads ?? 0}  icon={Users} color="emerald" />
        <StatCard title="Active Clients"  value={stats.activeClients ?? 0}  icon={TrendingUp} color="blue" />
        <StatCard title="Hot Leads"     value={stats.hotLeads ?? 0} icon={Flame} color="yellow" />
        <StatCard title="Pending Follow-ups" value={stats.pendingFollowups ?? 0} icon={Clock3} color="blue" />
        <StatCard title="Unresolved Issues" value={stats.unresolvedAlerts ?? 0} icon={AlertTriangle} color="red" />
        <StatCard title="Payments Received" value={`PKR ${(stats.paymentsReceivedAmount || 0).toLocaleString()}`} icon={Wallet} color="emerald" />
        <StatCard title="Payments Pending" value={`PKR ${(stats.paymentsPendingAmount || 0).toLocaleString()}`} icon={Wallet} color="yellow" />
        <StatCard title="Campaigns Running" value={stats.campaignsRunning ?? 0} icon={Megaphone} color="blue" />
        <StatCard title="Team Activity" value={`${stats.activeClients ?? 0} active`} icon={Users} color="emerald" />
        <StatCard title="AI Requests Today" value={stats.aiRequestsToday ?? 0} icon={Bot} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Alerts Panel */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold mb-3 text-white">Live Alerts</h3>
          <div className="space-y-2">
            {alerts.length === 0 && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-6 text-center text-gray-500 text-sm">
                No open alerts 🎉
              </div>
            )}
            {alerts.map(a => (
              <div key={a.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ALERT_COLORS[a.type] || 'bg-gray-500/20 text-gray-400'}`}>
                        {a.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-white font-medium truncate">{a.name || a.whatsapp_number}</span>
                    </div>
                    <p className="text-xs text-gray-500">{a.message}</p>
                  </div>
                  <div className="flex gap-2 ml-3 shrink-0">
                    {a.client_id && (
                      <button
                        onClick={() => { setReplyAlert(a); setReplyMsg(''); }}
                        className="text-xs text-blue-400 hover:text-blue-300 border border-blue-400/20 px-2 py-1 rounded-lg transition-colors"
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

          {/* Quick Stats + AI Recommendations */}
          <div className="mt-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <h4 className="text-xs font-semibold text-gray-400 mb-3">This Week</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Active Clients</span>
                <span className="text-white font-medium">{stats.activeClients ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Pending Payments</span>
                <span className="text-yellow-400 font-medium">{stats.pendingPayments ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">New Clients</span>
                <span className="text-emerald-400 font-medium">{stats.newThisWeek ?? 0}</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#2a2a2a]">
              <h5 className="text-xs text-gray-400 mb-2">AI Recommendations</h5>
              <ul className="space-y-1 text-xs text-gray-300">
                <li>• Prioritize {stats.hotLeads ?? 0} hot leads for sales follow-up.</li>
                <li>• Resolve {stats.unresolvedAlerts ?? 0} open issues to improve conversion.</li>
                <li>• Run campaign optimization for low-response segments.</li>
              </ul>
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
