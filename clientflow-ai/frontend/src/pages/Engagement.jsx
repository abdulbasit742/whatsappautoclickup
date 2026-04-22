import { useEffect, useState } from 'react';
import { Zap, TrendingUp, Bell, Plus } from 'lucide-react';
import api from '../utils/api';

const SCORE_COLOR = s => s >= 70 ? 'text-emerald-400' : s >= 40 ? 'text-yellow-400' : 'text-red-400';
const SCORE_BG    = s => s >= 70 ? 'bg-emerald-500' : s >= 40 ? 'bg-yellow-500' : 'bg-red-500';

export default function Engagement() {
  const [campaigns, setCampaigns] = useState([]);
  const [triggers, setTriggers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [newCamp, setNewCamp]     = useState({ name: '', segment: 'all' });
  const [scoreSearch, setScoreSearch] = useState('');
  const [scoreResult, setScoreResult] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/engagement/campaigns'),
      api.get('/engagement/triggers'),
    ]).then(([campRes, trigRes]) => {
      setCampaigns(campRes.data);
      setTriggers(trigRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const getScore = async () => {
    if (!scoreSearch.trim()) return;
    try {
      const r = await api.get(`/engagement/score/${scoreSearch.trim()}`);
      setScoreResult(r.data);
    } catch { alert('Client not found'); }
  };

  const createCampaign = async () => {
    if (!newCamp.name) return alert('Campaign name required');
    await api.post('/engagement/campaigns', newCamp);
    const r = await api.get('/engagement/campaigns');
    setCampaigns(r.data);
    setNewCamp({ name: '', segment: 'all' });
  };

  if (loading) return <div className="text-emerald-400 animate-pulse">Loading engagement data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Zap size={20} className="text-emerald-400" /> Proactive Engagement</h2>
        <div className="flex gap-2">
          {['campaigns', 'triggers', 'score'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${activeTab === tab ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'score' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input value={scoreSearch} onChange={e => setScoreSearch(e.target.value)}
              placeholder="Enter client ID..."
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 flex-1" />
            <button onClick={getScore} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm">Check Score</button>
          </div>
          {scoreResult && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${SCORE_COLOR(scoreResult.score)}`}>{scoreResult.score}</div>
                  <div className="text-xs text-gray-500">Engagement Score</div>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-[#2a2a2a] rounded-full h-3">
                    <div className={`h-3 rounded-full ${SCORE_BG(scoreResult.score)} transition-all`} style={{ width: `${scoreResult.score}%` }} />
                  </div>
                </div>
              </div>
              {scoreResult.matchedRules?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium">TRIGGERED RULES</p>
                  {scoreResult.matchedRules.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Bell size={12} className="text-yellow-400" />
                      <span className="text-white">{r.trigger}</span>
                      <span className="text-gray-500">—</span>
                      <span className="text-gray-400">{r.template}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Plus size={14} className="text-emerald-400" /> New Campaign</h3>
            <div className="flex gap-3">
              <input value={newCamp.name} onChange={e => setNewCamp(p => ({ ...p, name: e.target.value }))}
                placeholder="Campaign name..."
                className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 flex-1" />
              <select value={newCamp.segment} onChange={e => setNewCamp(p => ({ ...p, segment: e.target.value }))}
                className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                {['all', 'inactive', 'new', 'loyal'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={createCampaign} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm">Create</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map(c => (
              <div key={c.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white text-sm">{c.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{c.status}</span>
                </div>
                <p className="text-xs text-gray-500">{c.client_count} clients · {c.segment} segment</p>
              </div>
            ))}
            {campaigns.length === 0 && <p className="text-gray-500 text-sm col-span-2 text-center py-8">No campaigns yet</p>}
          </div>
        </div>
      )}

      {activeTab === 'triggers' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#2a2a2a]">
              <th className="text-left px-4 py-3 text-gray-400">Client</th>
              <th className="text-left px-4 py-3 text-gray-400">Trigger</th>
              <th className="text-left px-4 py-3 text-gray-400">Score</th>
              <th className="text-left px-4 py-3 text-gray-400">Time</th>
            </tr></thead>
            <tbody>
              {triggers.map(t => (
                <tr key={t.id} className="border-b border-[#1f1f1f] hover:bg-white/5">
                  <td className="px-4 py-3 text-white">{t.name || t.whatsapp_number}</td>
                  <td className="px-4 py-3 text-gray-400">{t.trigger_type}</td>
                  <td className="px-4 py-3"><span className={`text-sm font-medium ${SCORE_COLOR(t.score)}`}>{t.score}</span></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.fired_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
