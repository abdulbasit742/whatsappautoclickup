import { useEffect, useState } from 'react';
import { Flame, TrendingUp, Snowflake, Search } from 'lucide-react';
import api from '../utils/api';

const TIER_STYLES = {
  hot:  { label: '🔥 Hot',  cls: 'bg-red-500/20 text-red-400' },
  warm: { label: '🌡️ Warm', cls: 'bg-yellow-500/20 text-yellow-400' },
  cold: { label: '❄️ Cold', cls: 'bg-blue-500/20 text-blue-400' },
};

export default function PQLDashboard() {
  const [leads, setLeads]   = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/pql').then(r => setLeads(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter(l => {
    const matchSearch = !search || (l.name || '').toLowerCase().includes(search.toLowerCase()) || l.whatsapp_number.includes(search);
    const matchFilter = filter === 'all' || l.tier === filter;
    return matchSearch && matchFilter;
  });

  const counts = { hot: leads.filter(l => l.tier === 'hot').length, warm: leads.filter(l => l.tier === 'warm').length, cold: leads.filter(l => l.tier === 'cold').length };

  if (loading) return <div className="text-gray-400">Loading PQL dashboard...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-white">Product Qualified Leads</h2>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {Object.entries(counts).map(([tier, count]) => {
          const s = TIER_STYLES[tier];
          return (
            <div key={tier} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center cursor-pointer" onClick={() => setFilter(filter === tier ? 'all' : tier)}>
              <p className={`text-xs px-2 py-0.5 rounded-full inline-block mb-2 ${s.cls}`}>{s.label}</p>
              <p className="text-2xl font-bold text-white">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-8 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'hot', 'warm', 'cold'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${filter === f ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-[#2a2a2a] bg-[#111]">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">WhatsApp</th>
                <th className="text-center px-4 py-3">PQL Score</th>
                <th className="text-center px-4 py-3">Tier</th>
                <th className="text-right px-4 py-3">Campaigns</th>
                <th className="text-right px-4 py-3">AI Usage</th>
                <th className="text-right px-4 py-3">Feature Uses</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">No leads found.</td></tr>
              )}
              {filtered.map(l => {
                const s = TIER_STYLES[l.tier];
                return (
                  <tr key={l.id} className="border-b border-[#1f1f1f] hover:bg-[#222]">
                    <td className="px-4 py-3 text-white">{l.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{l.whatsapp_number}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${l.pql_score}%` }} />
                        </div>
                        <span className="text-white font-bold text-xs">{l.pql_score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">{l.campaigns}</td>
                    <td className="px-4 py-3 text-right text-purple-400">{l.ai_usage}</td>
                    <td className="px-4 py-3 text-right text-blue-400">{l.feature_uses}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
