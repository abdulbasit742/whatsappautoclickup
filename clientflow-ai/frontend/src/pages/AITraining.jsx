import { useEffect, useState } from 'react';
import { Brain, Plus, Trash2, X, RefreshCw, Star } from 'lucide-react';
import api from '../utils/api';

const LABELS = ['greeting', 'complaint', 'inquiry', 'pricing', 'support', 'sales', 'feedback', 'other'];

export default function AITraining() {
  const [data, setData]     = useState([]);
  const [stats, setStats]   = useState([]);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm]     = useState({ input: '', output: '', label: 'inquiry', quality: 3 });

  const load = async () => {
    const [d, s] = await Promise.all([
      api.get('/ai-training', { params: { label: filter || undefined } }),
      api.get('/ai-training/stats'),
    ]);
    setData(d.data);
    setStats(s.data);
  };

  useEffect(() => { load(); }, [filter]);

  const add = async () => {
    if (!form.input || !form.output) return;
    await api.post('/ai-training', form);
    setAdding(false);
    setForm({ input: '', output: '', label: 'inquiry', quality: 3 });
    load();
  };

  const remove = async (id) => {
    await api.delete(`/ai-training/${id}`);
    load();
  };

  const updateQuality = async (id, quality) => {
    await api.put(`/ai-training/${id}`, { quality });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain size={20} className="text-emerald-400" />
          <h2 className="text-xl font-bold text-white">AI Training Data</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={load}><RefreshCw size={14} className="text-gray-500 hover:text-gray-300" /></button>
          <button onClick={() => setAdding(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
            <Plus size={14} /> Add Example
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.slice(0, 4).map(s => (
          <div key={s.label || 'unlabeled'} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="text-lg font-bold text-white">{s.count}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label || 'unlabeled'}</div>
            <div className="flex items-center gap-1 mt-1">
              <Star size={10} className="text-yellow-400" />
              <span className="text-xs text-yellow-400">{s.avg_quality}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === '' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'}`}>
          All
        </button>
        {LABELS.map(l => (
          <button key={l} onClick={() => setFilter(l === filter ? '' : l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === l ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Data table */}
      <div className="space-y-3">
        {data.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-10 text-center text-gray-500">No training examples yet</div>
        ) : data.map(d => (
          <div key={d.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">{d.label || 'unlabeled'}</span>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(q => (
                      <button key={q} onClick={() => updateQuality(d.id, q)}>
                        <Star size={12} className={q <= d.quality ? 'text-yellow-400' : 'text-gray-600'} fill={q <= d.quality ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                  {d.used_in_prompt && <span className="text-xs text-gray-600">used in prompt</span>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Input</p>
                    <p className="text-sm text-gray-300 line-clamp-2">{d.input}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Expected Output</p>
                    <p className="text-sm text-gray-300 line-clamp-2">{d.output}</p>
                  </div>
                </div>
              </div>
              <button onClick={() => remove(d.id)} className="text-gray-600 hover:text-red-400 shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add modal */}
      {adding && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Add Training Example</h3>
              <button onClick={() => setAdding(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">User Input / Message</label>
                <textarea value={form.input} onChange={e => setForm(f => ({ ...f, input: e.target.value }))}
                  rows={3} placeholder="What the user said..."
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ideal AI Response</label>
                <textarea value={form.output} onChange={e => setForm(f => ({ ...f, output: e.target.value }))}
                  rows={3} placeholder="What the AI should respond..."
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Label</label>
                  <select value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                    {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Quality (1-5)</label>
                  <div className="flex gap-1 pt-2">
                    {[1,2,3,4,5].map(q => (
                      <button key={q} onClick={() => setForm(f => ({ ...f, quality: q }))}>
                        <Star size={20} className={q <= form.quality ? 'text-yellow-400' : 'text-gray-600'} fill={q <= form.quality ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={add} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Add</button>
              <button onClick={() => setAdding(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
