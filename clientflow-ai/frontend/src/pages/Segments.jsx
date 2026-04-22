import { useEffect, useState } from 'react';
import { Brain, TrendingUp, Users, Star } from 'lucide-react';
import api from '../utils/api';

const SEGMENT_COLORS = {
  champion:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  loyal:       'bg-blue-500/20 text-blue-400 border-blue-500/30',
  potential:   'bg-purple-500/20 text-purple-400 border-purple-500/30',
  at_risk:     'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  cant_lose:   'bg-orange-500/20 text-orange-400 border-orange-500/30',
  hibernating: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  new_client:  'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

export default function Segments() {
  const [data, setData]           = useState({ segments: [], totalAnalyzed: 0 });
  const [upsell, setUpsell]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [newSeg, setNewSeg]       = useState({ name: '', description: '', minScore: 0, maxScore: 100, color: 'gray' });

  useEffect(() => {
    Promise.all([
      api.get('/segments'),
      api.get('/segments/upsell'),
    ]).then(([segRes, upsellRes]) => {
      setData(segRes.data);
      setUpsell(upsellRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const createSegment = async () => {
    await api.post('/segments', newSeg);
    setNewSeg({ name: '', description: '', minScore: 0, maxScore: 100, color: 'gray' });
    alert('Segment created!');
  };

  if (loading) return <div className="text-emerald-400 animate-pulse">Analyzing segments...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Brain size={20} className="text-emerald-400" /> AI Segment Prediction</h2>
          <p className="text-sm text-gray-500 mt-1">{data.totalAnalyzed} clients analyzed</p>
        </div>
        <div className="flex gap-2">
          {['overview', 'upsell', 'create'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${activeTab === tab ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.segments.map(seg => (
            <div key={seg.key} className={`bg-[#1a1a1a] border rounded-xl p-5 border-[#2a2a2a]`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-1 rounded-full border ${SEGMENT_COLORS[seg.key] || SEGMENT_COLORS.hibernating}`}>{seg.label}</span>
                <span className="text-2xl font-bold text-white">{seg.count}</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{seg.description}</p>
              <div className="space-y-1">
                {(seg.clients || []).slice(0, 3).map(c => (
                  <div key={c.clientId} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 truncate">{c.clientName}</span>
                    <span className="text-xs text-emerald-400">{c.score}/100</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'upsell' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#2a2a2a]">
            <h3 className="font-semibold text-white flex items-center gap-2"><TrendingUp size={16} className="text-emerald-400" /> Upsell Opportunities</h3>
          </div>
          <div className="divide-y divide-[#2a2a2a]">
            {upsell.map(u => (
              <div key={u.clientId} className="p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                  {(u.clientName || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{u.clientName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${SEGMENT_COLORS[u.segmentKey] || ''}`}>{u.segment}</span>
                    <span className="text-xs text-emerald-400 ml-auto">{u.score}/100</span>
                  </div>
                  {u.aiInsight && <p className="text-xs text-gray-400">{u.aiInsight}</p>}
                </div>
              </div>
            ))}
            {upsell.length === 0 && <p className="text-center text-gray-500 text-sm p-8">No upsell opportunities detected</p>}
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 max-w-lg">
          <h3 className="font-semibold text-white mb-4">Create Custom Segment</h3>
          <div className="space-y-4">
            {[
              { key: 'name', label: 'Segment Name', type: 'text' },
              { key: 'description', label: 'Description', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                <input value={newSeg[f.key]} onChange={e => setNewSeg(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Min Score (0-100)</label>
                <input type="number" min="0" max="100" value={newSeg.minScore}
                  onChange={e => setNewSeg(p => ({ ...p, minScore: parseInt(e.target.value) }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Max Score (0-100)</label>
                <input type="number" min="0" max="100" value={newSeg.maxScore}
                  onChange={e => setNewSeg(p => ({ ...p, maxScore: parseInt(e.target.value) }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
            <button onClick={createSegment} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
              Create Segment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
