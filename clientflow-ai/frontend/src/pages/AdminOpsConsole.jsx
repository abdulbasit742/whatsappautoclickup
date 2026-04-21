import { useEffect, useState } from 'react';
import { Search, AlertTriangle, Zap, Database, Activity } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';

export default function AdminOpsConsole() {
  const [overview, setOverview]   = useState({});
  const [queueHealth, setQueue]   = useState({});
  const [incidents, setIncidents] = useState([]);
  const [search, setSearch]       = useState('');
  const [results, setResults]     = useState([]);
  const [selected, setSelected]   = useState(null);
  const [billing, setBilling]     = useState(null);
  const [aiDiag, setAiDiag]       = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin-ops/overview').then(r => setOverview(r.data)),
      api.get('/admin-ops/queue-health').then(r => setQueue(r.data)),
      api.get('/admin-ops/recent-incidents').then(r => setIncidents(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const doSearch = async (q) => {
    setSearch(q);
    if (!q.trim()) { setResults([]); return; }
    const r = await api.get(`/admin-ops/search?q=${encodeURIComponent(q)}`);
    setResults(r.data);
  };

  const selectClient = async (c) => {
    setSelected(c);
    setBilling(null); setAiDiag(null);
    const [b, a] = await Promise.all([
      api.get(`/admin-ops/billing-lookup/${c.id}`),
      api.get(`/admin-ops/ai-diagnostics/${c.id}`),
    ]);
    setBilling(b.data); setAiDiag(a.data);
  };

  const SEVERITY_COLORS = {
    low: 'bg-blue-500/20 text-blue-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    high: 'bg-orange-500/20 text-orange-400',
    critical: 'bg-red-500/20 text-red-400',
  };

  if (loading) return <div className="text-gray-400">Loading admin console...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-white">Admin Operations Console</h2>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Clients',  value: overview.total_clients || 0,  color: 'text-white' },
          { label: 'Revenue (30d)',  value: `PKR ${Number(overview.revenue_30d || 0).toLocaleString()}`, color: 'text-emerald-400' },
          { label: 'Open Alerts',   value: overview.open_alerts || 0,     color: 'text-yellow-400' },
          { label: 'AI Errors (24h)', value: overview.ai_errors_24h || 0, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Queue health */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Activity size={14} className="text-blue-400" /> Queue Health Snapshot
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Pending Payments',   value: queueHealth.pending_payments   || 0, color: 'text-yellow-400' },
            { label: 'Overdue Follow-ups', value: queueHealth.overdue_followups  || 0, color: 'text-orange-400' },
            { label: 'Unresolved Alerts',  value: queueHealth.unresolved_alerts  || 0, color: 'text-red-400' },
            { label: 'Due Broadcasts',     value: queueHealth.due_broadcasts     || 0, color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#111] rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent incidents */}
      {incidents.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-400" /> Recent Incidents
          </h3>
          <div className="space-y-2">
            {incidents.map(i => (
              <div key={i.id} className="flex items-center gap-3 text-sm">
                <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_COLORS[i.severity] || 'bg-gray-500/20 text-gray-400'}`}>{i.severity}</span>
                <span className="text-white flex-1">{i.title}</span>
                <span className={`text-xs ${i.status === 'resolved' ? 'text-emerald-400' : 'text-red-400'}`}>{i.status}</span>
                <span className="text-gray-500 text-xs">{format(new Date(i.created_at), 'dd MMM')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Client Search */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Search size={14} className="text-emerald-400" /> Client Lookup
        </h3>
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
          <input
            value={search}
            onChange={e => doSearch(e.target.value)}
            placeholder="Search by name, phone, email..."
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg pl-8 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {results.length > 0 && (
          <div className="space-y-1 mb-4">
            {results.map(c => (
              <div key={c.id} onClick={() => selectClient(c)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selected?.id === c.id ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-[#222]'}`}>
                <div className="flex-1">
                  <p className="text-sm text-white">{c.name || '—'}</p>
                  <p className="text-xs text-gray-500">{c.whatsapp_number} · {c.status}</p>
                </div>
                <p className="text-xs text-emerald-400">PKR {Number(c.total_spent_pkr).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div className="mt-4 space-y-4">
            {/* Billing */}
            {billing && (
              <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-4">
                <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase flex items-center gap-1">
                  <Database size={11} /> Billing Lookup — {billing.client?.name || selected.whatsapp_number}
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-[#1a1a1a] rounded-lg p-2">
                    <p className="text-xs text-gray-500">Pending</p>
                    <p className="text-sm font-bold text-yellow-400">{billing.pending_count} · PKR {Number(billing.pending_amount).toLocaleString()}</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-2">
                    <p className="text-xs text-gray-500">Total Spent</p>
                    <p className="text-sm font-bold text-emerald-400">PKR {Number(billing.client?.total_spent_pkr || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {billing.payments?.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{p.service_name || 'Payment'}</span>
                      <span className="text-white">PKR {Number(p.amount_pkr).toLocaleString()}</span>
                      <span className={`px-1.5 py-0.5 rounded ${p.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Diagnostics */}
            {aiDiag && aiDiag.length > 0 && (
              <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-4">
                <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase flex items-center gap-1">
                  <Zap size={11} /> AI Usage Diagnostics
                </h4>
                <div className="space-y-1">
                  {aiDiag.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 capitalize">{d.provider}</span>
                      <span className={d.success ? 'text-emerald-400' : 'text-red-400'}>{d.success ? '✓ Success' : '✗ Failed'}</span>
                      <span className="text-white">{d.count} calls</span>
                      <span className="text-gray-500">{format(new Date(d.last_used), 'dd MMM')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
