import { useEffect, useState } from 'react';
import { Filter, Save, Trash2, Users, Play } from 'lucide-react';
import api from '../utils/api';

const FILTER_FIELDS = [
  { key: 'status',    label: 'Status',     type: 'select', options: ['active','inactive','new'] },
  { key: 'lead_tier', label: 'Lead Tier',  type: 'select', options: ['hot','warm','cold'] },
  { key: 'min_score', label: 'Min Score',  type: 'number' },
  { key: 'tag',       label: 'Has Tag',    type: 'text' },
];

export default function Segments() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShow]   = useState(false);
  const [results, setResults]   = useState(null);
  const [form, setForm]         = useState({ name: '', description: '', filters: {}, is_shared: false });

  const load = () => api.get('/segments').then(r => setSegments(r.data));

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const create = async () => {
    await api.post('/segments', form);
    setShow(false);
    setForm({ name: '', description: '', filters: {}, is_shared: false });
    await load();
  };

  const del = async (id) => { await api.delete(`/segments/${id}`); setSegments(s => s.filter(x => x.id !== id)); };

  const apply = async (id) => {
    const r = await api.post(`/segments/${id}/apply`);
    setResults(r.data);
  };

  if (loading) return <div className="text-gray-400">Loading segments...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Filter size={20} className="text-indigo-400" /> Saved Segments</h2>
        <button onClick={() => setShow(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Save size={14} /> Save Segment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {segments.map(seg => (
          <div key={seg.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{seg.name}</span>
                  {seg.is_shared && <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 rounded">Shared</span>}
                </div>
                {seg.description && <p className="text-xs text-gray-500 mt-0.5">{seg.description}</p>}
                <div className="mt-2 flex gap-1 flex-wrap">
                  {Object.entries(seg.filters || {}).map(([k,v]) => (
                    <span key={k} className="text-xs bg-[#2a2a2a] text-gray-400 px-1.5 py-0.5 rounded">{k}: {v}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => apply(seg.id)} className="text-xs text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-lg hover:bg-emerald-500/10 flex items-center gap-1">
                  <Play size={10}/> Apply
                </button>
                <button onClick={() => del(seg.id)} className="text-gray-500 hover:text-red-400 p-1.5"><Trash2 size={13}/></button>
              </div>
            </div>
          </div>
        ))}
        {segments.length === 0 && <div className="col-span-2 text-center text-gray-500 py-12">No segments saved.</div>}
      </div>

      {/* Results panel */}
      {results && (
        <div className="mt-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-white">Segment Results — {results.count} contacts</h3>
            <button onClick={() => setResults(null)} className="text-xs text-gray-500">✕</button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {results.contacts?.map(c => (
              <div key={c.id} className="flex justify-between text-sm py-1.5 border-b border-[#222]">
                <span className="text-white">{c.name || c.whatsapp_number}</span>
                <span className={`text-xs ${c.lead_tier === 'hot' ? 'text-red-400' : c.lead_tier === 'warm' ? 'text-yellow-400' : 'text-blue-400'}`}>{c.lead_tier}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-white mb-4">Create Segment</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Segment name" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none" />
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none" />
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Filters:</p>
                {FILTER_FIELDS.map(field => (
                  <div key={field.key} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-24">{field.label}</span>
                    {field.type === 'select' ? (
                      <select value={form.filters[field.key] || ''} onChange={e => setForm(f => ({ ...f, filters: { ...f.filters, [field.key]: e.target.value || undefined } }))}
                        className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white outline-none">
                        <option value="">Any</option>
                        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input value={form.filters[field.key] || ''} onChange={e => setForm(f => ({ ...f, filters: { ...f.filters, [field.key]: e.target.value || undefined } }))}
                        type={field.type} placeholder="Any" className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white outline-none" />
                    )}
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input type="checkbox" checked={form.is_shared} onChange={e => setForm(f => ({ ...f, is_shared: e.target.checked }))} className="rounded" />
                Share with team
              </label>
              <div className="flex gap-3">
                <button onClick={() => setShow(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={create} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
