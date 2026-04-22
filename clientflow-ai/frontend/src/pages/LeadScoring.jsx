import { useEffect, useState } from 'react';
import { Target, TrendingUp, RefreshCw } from 'lucide-react';
import api from '../utils/api';

const SCORE_COLOR = s => s >= 70 ? 'text-emerald-400' : s >= 40 ? 'text-yellow-400' : 'text-red-400';
const SCORE_BG    = s => s >= 70 ? 'bg-emerald-500' : s >= 40 ? 'bg-yellow-500' : 'bg-red-500';

export default function LeadScoring() {
  const [leads, setLeads]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = () => api.get('/leads/priority').then(r => setLeads(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const refresh = async () => {
    setRefreshing(true);
    await api.post('/leads/refresh');
    await load();
    setRefreshing(false);
  };

  const selectLead = async lead => {
    setSelected(lead);
    try {
      const r = await api.get(`/leads/conversion/${lead.clientId}`);
      setSelected(prev => ({ ...prev, conversion: r.data }));
    } catch {}
  };

  if (loading) return <div className="text-emerald-400 animate-pulse">Loading leads...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Target size={20} className="text-emerald-400" /> Lead Scoring</h2>
        <button onClick={refresh} disabled={refreshing}
          className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-emerald-500 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh Scores
        </button>
      </div>

      {/* Top-3 summary */}
      {leads.slice(0, 3).length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {leads.slice(0, 3).map((l, i) => (
            <div key={l.clientId} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">#{i + 1} Priority Lead</div>
              <div className="text-sm font-medium text-white truncate">{l.clientName}</div>
              <div className={`text-2xl font-bold mt-1 ${SCORE_COLOR(l.score)}`}>{l.score}<span className="text-sm font-normal text-gray-500">/100</span></div>
              <div className="mt-2 w-full bg-[#2a2a2a] rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${SCORE_BG(l.score)}`} style={{ width: `${l.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4" style={{ minHeight: '400px' }}>
        {/* Lead list */}
        <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#2a2a2a]">
              <th className="text-left px-4 py-3 text-gray-400">Rank</th>
              <th className="text-left px-4 py-3 text-gray-400">Lead</th>
              <th className="text-left px-4 py-3 text-gray-400">Score</th>
              <th className="text-left px-4 py-3 text-gray-400">Conversion</th>
              <th className="text-left px-4 py-3 text-gray-400">Spent</th>
            </tr></thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.clientId} onClick={() => selectLead(l)}
                  className={`border-b border-[#1f1f1f] cursor-pointer hover:bg-white/5 ${selected?.clientId === l.clientId ? 'bg-emerald-500/5' : ''}`}>
                  <td className="px-4 py-3 text-gray-500 text-xs">#{l.rank}</td>
                  <td className="px-4 py-3">
                    <div className="text-white">{l.clientName}</div>
                    <div className="text-xs text-gray-500">{l.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-[#2a2a2a] rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${SCORE_BG(l.score)}`} style={{ width: `${l.score}%` }} />
                      </div>
                      <span className={`text-sm font-medium ${SCORE_COLOR(l.score)}`}>{l.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`text-sm ${SCORE_COLOR(l.conversionProbability)}`}>{l.conversionProbability}%</span></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">PKR {Number(l.totalSpent).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-72 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 shrink-0 space-y-4">
            <div>
              <h3 className="font-semibold text-white">{selected.clientName}</h3>
              <p className="text-xs text-gray-500">{selected.phone}</p>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-2">Score Breakdown</div>
              {selected.breakdown && Object.entries(selected.breakdown).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-gray-400 w-24 capitalize">{key}</span>
                  <div className="flex-1 bg-[#2a2a2a] rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, val * 4)}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-6 text-right">{val}</span>
                </div>
              ))}
            </div>
            {selected.conversion && (
              <div className="bg-[#0f0f0f] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Conversion Probability</div>
                <div className={`text-2xl font-bold ${SCORE_COLOR(selected.conversion.conversionProbability)}`}>
                  {selected.conversion.conversionProbability}%
                </div>
                <p className="text-xs text-gray-400 mt-1">{selected.conversion.recommendation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
