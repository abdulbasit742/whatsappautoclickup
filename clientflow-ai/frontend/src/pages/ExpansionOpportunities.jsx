import { useEffect, useState } from 'react';
import { Zap, TrendingUp, Users, BarChart2 } from 'lucide-react';
import api from '../utils/api';

const SECTIONS = [
  { key: 'high_ai_usage',       label: 'High AI Usage',       icon: Zap,        color: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-400' },
  { key: 'growing_contacts',    label: 'Growing Contacts',    icon: TrendingUp,  color: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400' },
  { key: 'high_campaign_usage', label: 'High Campaign Usage', icon: BarChart2,  color: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400' },
  { key: 'high_spenders',       label: 'High Spenders',       icon: Users,      color: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400' },
];

export default function ExpansionOpportunities() {
  const [data, setData]   = useState(null);
  const [tab, setTab]     = useState('high_ai_usage');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/expansion').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Loading expansion opportunities...</div>;
  if (!data) return null;

  const { summary } = data;
  const current = SECTIONS.find(s => s.key === tab);
  const rows = data[tab] || [];

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-white">Expansion Opportunities</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const count = summary[s.key.replace('_usage', '_count').replace('_contacts', '_count').replace('_spenders', '_spender_count')] || 0;
          return (
            <div key={s.key} onClick={() => setTab(s.key)}
              className={`bg-[#1a1a1a] border rounded-xl p-4 cursor-pointer transition-colors ${tab === s.key ? 'border-emerald-500/50' : 'border-[#2a2a2a]'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className={s.color} />
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
              <p className="text-2xl font-bold text-white">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Upsell prompt */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
        <p className="text-sm text-yellow-300 font-medium mb-1">💡 Upgrade Prompt</p>
        <p className="text-xs text-yellow-200/70">
          These clients are showing strong growth signals. Reach out to discuss premium plans, additional seats, or expanded AI usage limits.
        </p>
      </div>

      {/* Client list for selected section */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          {current && <current.icon size={14} className={current.color} />}
          {current?.label} — {rows.length} Clients
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-[#2a2a2a]">
                <th className="text-left pb-2">Name</th>
                <th className="text-left pb-2">WhatsApp</th>
                <th className="text-left pb-2">Status</th>
                <th className="text-right pb-2">Total Spent</th>
                {tab === 'high_ai_usage' && <th className="text-right pb-2">AI Calls (30d)</th>}
                {tab === 'high_campaign_usage' && <th className="text-right pb-2">Broadcasts (30d)</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-gray-500">No records in this category.</td></tr>
              )}
              {rows.map(c => (
                <tr key={c.id} className="border-b border-[#1f1f1f] hover:bg-[#222]">
                  <td className="py-2 text-white">{c.name || '—'}</td>
                  <td className="py-2 text-gray-400">{c.whatsapp_number}</td>
                  <td className="py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{c.status}</span></td>
                  <td className="py-2 text-right text-emerald-400">PKR {Number(c.total_spent_pkr).toLocaleString()}</td>
                  {tab === 'high_ai_usage' && <td className="py-2 text-right text-purple-400">{c.ai_calls}</td>}
                  {tab === 'high_campaign_usage' && <td className="py-2 text-right text-yellow-400">{c.broadcast_count}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
