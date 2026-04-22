import { useEffect, useState } from 'react';
import { Gauge, Ban, AlertTriangle, Settings } from 'lucide-react';
import api from '../utils/api';

export default function RateLimits() {
  const [limits, setLimits]       = useState(null);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      api.get('/rate-limits'),
      api.get('/rate-limits/violations'),
    ]).then(([lRes, vRes]) => {
      setLimits(lRes.data);
      setViolations(vRes.data.violations || []);
    }).finally(() => setLoading(false));
  }, []);

  const UsageGauge = ({ label, used, max }) => {
    const pct = max > 0 ? Math.round((used / max) * 100) : 0;
    const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-emerald-500';
    return (
      <div className="bg-[#0f0f0f] rounded-lg p-4">
        <div className="flex justify-between mb-2">
          <span className="text-xs text-gray-400 capitalize">{label}</span>
          <span className="text-xs text-gray-300">{used}/{max}</span>
        </div>
        <div className="w-full bg-[#2a2a2a] rounded-full h-2">
          <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <div className="text-right text-xs mt-1 text-gray-500">{pct}%</div>
      </div>
    );
  };

  if (loading) return <div className="text-emerald-400 animate-pulse">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Gauge size={20} className="text-emerald-400" /> API Rate Limits</h2>
        <div className="flex gap-2">
          {['overview', 'violations'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${activeTab === tab ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && limits && (
        <div className="space-y-6">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={16} className="text-emerald-400" />
              <span className="text-sm font-semibold text-white">Current Plan: <span className="text-emerald-400 capitalize">{limits.plan}</span></span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <UsageGauge label="Per User (per min)"   used={limits.usage?.user?.used || 0} max={limits.limits?.user || 100} />
              <UsageGauge label="Per Org (per min)"    used={limits.usage?.org?.used  || 0} max={limits.limits?.org  || 1000} />
              <UsageGauge label="Per IP (per min)"     used={limits.usage?.ip?.used   || 0} max={limits.limits?.ip   || 200} />
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Plan Limits Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-[#2a2a2a]">
                  <th className="text-left px-3 py-2 text-gray-400">Plan</th>
                  <th className="px-3 py-2 text-gray-400">User/min</th>
                  <th className="px-3 py-2 text-gray-400">Org/min</th>
                  <th className="px-3 py-2 text-gray-400">IP/min</th>
                </tr></thead>
                <tbody>
                  {Object.entries(limits.allPlans || {}).map(([plan, l]) => (
                    <tr key={plan} className={`border-b border-[#1f1f1f] ${plan === limits.plan ? 'bg-emerald-500/5' : ''}`}>
                      <td className={`px-3 py-2 capitalize font-medium ${plan === limits.plan ? 'text-emerald-400' : 'text-gray-400'}`}>{plan}</td>
                      <td className="px-3 py-2 text-center text-gray-300">{l.user}</td>
                      <td className="px-3 py-2 text-center text-gray-300">{l.org}</td>
                      <td className="px-3 py-2 text-center text-gray-300">{l.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'violations' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#2a2a2a] flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-400" />
            <span className="text-sm font-semibold text-white">Rate Limit Violations ({violations.length})</span>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#2a2a2a]">
              <th className="text-left px-4 py-3 text-gray-400">Type</th>
              <th className="text-left px-4 py-3 text-gray-400">ID</th>
              <th className="text-left px-4 py-3 text-gray-400">Endpoint</th>
              <th className="text-left px-4 py-3 text-gray-400">IP</th>
              <th className="text-left px-4 py-3 text-gray-400">Time</th>
            </tr></thead>
            <tbody>
              {violations.map((v, i) => (
                <tr key={i} className="border-b border-[#1f1f1f] hover:bg-white/5">
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">{v.type}</span></td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{String(v.id).slice(0, 12)}...</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{v.path}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{v.ip}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(v.timestamp).toLocaleTimeString()}</td>
                </tr>
              ))}
              {violations.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No violations detected</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
