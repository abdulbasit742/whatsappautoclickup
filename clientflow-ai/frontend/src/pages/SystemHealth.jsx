import { useEffect, useState } from 'react';
import { Activity, Server, Database, Zap, AlertCircle, CheckCircle, RefreshCw, Clock } from 'lucide-react';
import api from '../utils/api';

const STATUS_ICON = {
  ok:      { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  warning: { icon: AlertCircle, color: 'text-yellow-400',  bg: 'bg-yellow-400/10' },
  error:   { icon: AlertCircle, color: 'text-red-400',     bg: 'bg-red-400/10' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_ICON[status] || STATUS_ICON.ok;
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
      <Icon size={12} /> {status}
    </span>
  );
}

export default function SystemHealth() {
  const [health, setHealth]   = useState(null);
  const [aiStats, setAiStats] = useState({ health: {}, stats: [] });
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [h, a] = await Promise.all([
        api.get('/health'),
        api.get('/health/ai'),
      ]);
      setHealth(h.data);
      setAiStats(a.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const formatUptime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity size={20} className="text-emerald-400" />
          <h2 className="text-xl font-bold text-white">System Health</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAutoRefresh(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${autoRefresh ? 'border-emerald-500/30 text-emerald-400' : 'border-[#2a2a2a] text-gray-400 hover:text-white'}`}>
            <Clock size={14} /> {autoRefresh ? 'Auto (15s)' : 'Auto Off'}
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {!health ? (
        <div className="text-center text-gray-500 py-12">Loading system status...</div>
      ) : (
        <>
          {/* Core services */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'API Server',        icon: Server,   status: health.api?.status || 'ok',      detail: `Uptime: ${formatUptime(health.api?.uptime_seconds || 0)}` },
              { label: 'Database',          icon: Database, status: health.database?.status || 'ok', detail: 'PostgreSQL' },
              { label: 'Message Queue',     icon: Activity, status: health.queue?.status || 'ok',    detail: `${health.queue?.pending_followups || 0} pending` },
              { label: 'Unresolved Alerts', icon: AlertCircle, status: health.unresolved_alerts > 10 ? 'warning' : 'ok', detail: `${health.unresolved_alerts || 0} open` },
            ].map(({ label, icon: Icon, status, detail }) => {
              const cfg = STATUS_ICON[status] || STATUS_ICON.ok;
              return (
                <div key={label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${cfg.bg}`}>
                      <Icon size={16} className={cfg.color} />
                    </div>
                    <StatusBadge status={status} />
                  </div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
                </div>
              );
            })}
          </div>

          {/* Memory */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-white mb-3">Memory Usage</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 bg-[#2a2a2a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${health.memory ? (health.memory.used_mb / health.memory.total_mb) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm text-gray-400 shrink-0">
                {health.memory?.used_mb || 0} MB / {health.memory?.total_mb || 0} MB
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>Heap Used</span>
              <span>Messages last hour: {health.messages_last_hour || 0}</span>
            </div>
          </div>

          {/* AI Provider Status */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-white mb-4">AI Provider Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(health.ai_providers || []).map(p => {
                const stat = aiStats.stats?.find(s => s.provider === p.name) || {};
                return (
                  <div key={p.name} className={`p-4 rounded-xl border ${p.available ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white capitalize">{p.name}</span>
                      <span className={`w-2 h-2 rounded-full ${p.available ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>Calls (24h): {stat.calls || 0}</div>
                      <div>Failures: {stat.failures || 0}</div>
                      <div>Avg latency: {stat.avg_latency ? `${stat.avg_latency}ms` : '—'}</div>
                    </div>
                    {p.last_error && (
                      <p className="text-xs text-red-400 mt-1 truncate" title={p.last_error}>Error: {p.last_error.slice(0, 40)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-gray-600 text-right">Last checked: {new Date(health.checked_at).toLocaleTimeString()}</p>
        </>
      )}
    </div>
  );
}
