import { useState, useEffect } from 'react';
import { Users, TrendingUp, ArrowRight, RefreshCw } from 'lucide-react';
import api from '../utils/api';

const ORG_ID = 'demo-org';

const STAGES = [
  { key: 'new',       label: 'New',       color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30' },
  { key: 'active',    label: 'Active',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  { key: 'engaged',   label: 'Engaged',   color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/30' },
  { key: 'at_risk',   label: 'At Risk',   color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30' },
  { key: 'churned',   label: 'Churned',   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30' },
  { key: 'won_back',  label: 'Won Back',  color: 'text-emerald-300', bg: 'bg-teal-500/10 border-teal-500/30' },
];

export default function LifecycleDashboard() {
  const [data, setData] = useState(null);
  const [winback, setWinback] = useState([]);
  const [renewal, setRenewal] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [lc, wb, rn] = await Promise.all([
        api.get(`/health/${ORG_ID}/lifecycle`).then(r => r.data),
        api.get(`/health/${ORG_ID}/winback`).then(r => r.data),
        api.get(`/health/${ORG_ID}/renewals`).then(r => r.data),
      ]);
      setData(lc);
      setWinback(wb);
      setRenewal(rn);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const total = data ? Object.values(data.stage_counts).reduce((s,v) => s + parseInt(v||0), 0) : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Users size={20}/> Customer Lifecycle</h1>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] text-white text-sm rounded-lg transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stage cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {STAGES.map((stage, i) => {
            const count = parseInt(data.stage_counts[stage.key] || 0);
            const pct = total > 0 ? Math.round((count/total)*100) : 0;
            return (
              <div key={stage.key} className={`border rounded-xl p-4 text-center ${stage.bg}`}>
                <div className={`text-3xl font-bold ${stage.color}`}>{count}</div>
                <div className="text-white text-xs font-medium mt-1">{stage.label}</div>
                <div className="text-gray-500 text-xs mt-0.5">{pct}%</div>
                {i < STAGES.length - 1 && (
                  <ArrowRight size={12} className="text-gray-600 mx-auto mt-2 hidden lg:block" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Funnel bar */}
      {data && total > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-white font-semibold text-sm mb-4">Lifecycle Distribution</h2>
          <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
            {STAGES.map(stage => {
              const count = parseInt(data.stage_counts[stage.key] || 0);
              const pct = total > 0 ? (count/total)*100 : 0;
              if (pct === 0) return null;
              const bgMap = { 'text-blue-400':'bg-blue-500', 'text-emerald-400':'bg-emerald-500', 'text-purple-400':'bg-purple-500', 'text-yellow-400':'bg-yellow-500', 'text-red-400':'bg-red-500', 'text-emerald-300':'bg-teal-500' };
              return (
                <div key={stage.key} title={`${stage.label}: ${count}`}
                  className={`${bgMap[stage.color] || 'bg-gray-500'} transition-all`}
                  style={{ width: `${pct}%` }} />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {STAGES.map(stage => (
              <div key={stage.key} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className={`w-2.5 h-2.5 rounded-sm inline-block ${{'text-blue-400':'bg-blue-500','text-emerald-400':'bg-emerald-500','text-purple-400':'bg-purple-500','text-yellow-400':'bg-yellow-500','text-red-400':'bg-red-500','text-emerald-300':'bg-teal-500'}[stage.color]||'bg-gray-500'}`}/>
                {stage.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly trend */}
      {data?.trends?.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2"><TrendingUp size={14}/>New Clients — Last 6 Weeks</h2>
          <div className="flex items-end gap-2 h-24">
            {data.trends.map((t, i) => {
              const max = Math.max(...data.trends.map(x => parseInt(x.new_clients)));
              const h = max > 0 ? (parseInt(t.new_clients) / max) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-gray-400">{t.new_clients}</div>
                  <div className="w-full bg-emerald-500/80 rounded-t transition-all" style={{ height: `${h}%`, minHeight: 2 }} />
                  <div className="text-xs text-gray-600">{new Date(t.week).toLocaleDateString('en',{month:'short',day:'numeric'})}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Renewal upcoming */}
      {renewal?.upcoming && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-white font-semibold text-sm mb-3">Upcoming Renewal</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white">{renewal.upcoming.plan_name}</div>
              <div className="text-sm text-gray-400 mt-0.5">
                Renews: {renewal.upcoming.current_period_end ? new Date(renewal.upcoming.current_period_end).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div className="text-emerald-400 font-bold text-xl">${renewal.upcoming.price_monthly}/mo</div>
          </div>
        </div>
      )}

      {/* Win-back campaigns */}
      {winback.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-white font-semibold text-sm mb-3">Win-Back Campaigns</h2>
          <div className="space-y-2">
            {winback.map(w => (
              <div key={w.id} className="flex items-center justify-between bg-[#222] rounded-lg px-4 py-3">
                <div>
                  <div className="text-sm text-white capitalize">{w.trigger?.replace(/_/g,' ')}</div>
                  <div className="text-xs text-gray-500 capitalize">{w.action?.replace(/_/g,' ')}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${w.status==='converted'?'bg-emerald-500/10 text-emerald-400':w.status==='sent'?'bg-blue-500/10 text-blue-400':'bg-gray-500/10 text-gray-400'}`}>
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && !data && <div className="text-center py-12 text-gray-400 text-sm">Loading lifecycle data...</div>}
    </div>
  );
}
