import { useEffect, useState } from 'react';
import { Brain, Zap, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import api from '../utils/api';
import { format } from 'date-fns';

const PROVIDER_COLORS = {
  groq: 'text-emerald-400 bg-emerald-500/10',
  openai: 'text-blue-400 bg-blue-500/10',
  claude: 'text-purple-400 bg-purple-500/10',
  gemini: 'text-yellow-400 bg-yellow-500/10',
};

export default function AIDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/ai-dashboard').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 p-6">Loading...</div>;
  if (!data) return <div className="text-red-400 p-6">Failed to load AI data</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Brain size={24} className="text-purple-400" />
        <div>
          <h1 className="text-xl font-bold text-white">AI Dashboard</h1>
          <p className="text-sm text-gray-500">Groq active · Multi-provider fallback</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Zap, label: 'Total Requests (30d)', value: data.totalRequests.toLocaleString(), color: 'text-purple-400' },
          { icon: CheckCircle, label: 'Success Rate', value: `${data.successRate}%`, color: 'text-emerald-400' },
          { icon: Clock, label: 'Avg Latency', value: `${data.avgLatency}ms`, color: 'text-blue-400' },
          { icon: TrendingUp, label: 'Providers', value: data.byProvider.length, color: 'text-yellow-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Provider Usage */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-4">Provider Usage</h3>
          <div className="space-y-3">
            {data.byProvider.length === 0 && <p className="text-xs text-gray-500">No data yet</p>}
            {data.byProvider.map(p => (
              <div key={p.provider} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PROVIDER_COLORS[p.provider] || 'text-gray-400 bg-gray-500/10'}`}>
                    {p.provider}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{p.avg_latency}ms avg</span>
                  <span className="text-sm font-semibold text-white">{p.count} calls</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Usage Chart (simple) */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-4">Daily Usage (14 days)</h3>
          <div className="space-y-2">
            {data.dailyUsage.length === 0 && <p className="text-xs text-gray-500">No data yet</p>}
            {data.dailyUsage.slice(-7).map(d => {
              const max = Math.max(...data.dailyUsage.map(x => parseInt(x.count)), 1);
              const pct = Math.round((parseInt(d.count) / max) * 100);
              return (
                <div key={d.date} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">{format(new Date(d.date), 'MMM dd')}</span>
                  <div className="flex-1 bg-[#2a2a2a] rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{d.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Logs */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a2a2a]">
          <h3 className="text-sm font-semibold text-white">Recent AI Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {['Provider', 'Client', 'Latency', 'Status', 'Time'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentLogs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500 text-sm">No logs yet</td></tr>
              )}
              {data.recentLogs.map(log => (
                <tr key={log.id} className="border-b border-[#2a2a2a] hover:bg-white/5">
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${PROVIDER_COLORS[log.provider] || 'text-gray-400 bg-gray-500/10'}`}>
                      {log.provider || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-300 text-xs">{log.client_name || '—'}</td>
                  <td className="px-4 py-2 text-gray-300 text-xs">{log.latency_ms ? `${log.latency_ms}ms` : '—'}</td>
                  <td className="px-4 py-2">
                    {log.success
                      ? <span className="text-xs text-emerald-400">✓ success</span>
                      : <span className="text-xs text-red-400" title={log.error_message}>✗ failed</span>
                    }
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{format(new Date(log.created_at), 'dd MMM HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
