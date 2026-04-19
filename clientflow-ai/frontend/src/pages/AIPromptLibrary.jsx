import { useEffect, useState } from 'react';
import { BrainCircuit, Plus, Play, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../utils/api';

const CATEGORIES = ['reply_suggestion','summary','pricing_response','followup_suggestion','issue_classification','lead_scoring','campaign_copywriting'];

export default function AIPromptLibrary() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCat]   = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState({ name: '', category: '', prompt_text: '' });
  const [testInput, setTest]  = useState('');
  const [testResult, setRes]  = useState('');
  const [testing, setTesting] = useState(false);

  const load = () => {
    const q = catFilter ? `?category=${catFilter}` : '';
    return api.get(`/ai-prompts${q}`).then(r => setPrompts(r.data));
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, [catFilter]);

  const save = async () => {
    if (editing === 'new') await api.post('/ai-prompts', form);
    else await api.put(`/ai-prompts/${editing}`, form);
    setEditing(null);
    setForm({ name: '', category: '', prompt_text: '' });
    await load();
  };

  const toggle = async (id) => {
    await api.put(`/ai-prompts/${id}/toggle`);
    setPrompts(p => p.map(x => x.id === id ? { ...x, is_active: !x.is_active } : x));
  };

  const del = async (id) => {
    await api.delete(`/ai-prompts/${id}`);
    setPrompts(p => p.filter(x => x.id !== id));
  };

  const runTest = async (id) => {
    setTesting(true);
    setRes('');
    const r = await api.post(`/ai-prompts/${id}/test`, { input: testInput }).catch(e => ({ data: { output: e.response?.data?.error } }));
    setRes(r.data.output);
    setTesting(false);
  };

  if (loading) return <div className="text-gray-400">Loading AI prompts...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><BrainCircuit size={20} className="text-purple-400" /> AI Prompt Library</h2>
        <button onClick={() => { setEditing('new'); setForm({ name: '', category: CATEGORIES[0], prompt_text: '' }); }} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus size={14} /> New Prompt
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setCat('')} className={`px-3 py-1.5 rounded-lg text-xs ${!catFilter ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)} className={`px-3 py-1.5 rounded-lg text-xs capitalize ${catFilter === c ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
            {c.replace(/_/g,' ')}
          </button>
        ))}
      </div>

      {editing ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-white">{editing === 'new' ? 'Create' : 'Edit'} Prompt</h3>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Prompt name" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none" />
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none">
            {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#111]">{c.replace(/_/g,' ')}</option>)}
          </select>
          <textarea value={form.prompt_text} onChange={e => setForm(f => ({ ...f, prompt_text: e.target.value }))} rows={6} placeholder="Prompt text. Use {context} for dynamic data." className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none resize-none font-mono" />
          <div className="flex gap-3">
            <button onClick={() => setEditing(null)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            <button onClick={save} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Save</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {prompts.map(p => (
            <div key={p.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{p.name}</span>
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full capitalize">{p.category?.replace(/_/g,' ')}</span>
                    {!p.is_active && <span className="text-xs bg-gray-500/20 text-gray-500 px-2 py-0.5 rounded-full">Disabled</span>}
                    <span className="text-xs text-gray-600">v{p.version}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 font-mono">{p.prompt_text}</p>
                </div>
                <div className="flex gap-1 ml-3">
                  <button onClick={() => toggle(p.id)} className={p.is_active ? 'text-emerald-400' : 'text-gray-600'}>{p.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}</button>
                  <button onClick={() => { setEditing(p.id); setForm({ name: p.name, category: p.category, prompt_text: p.prompt_text }); }} className="text-xs text-blue-400 px-2 py-1">Edit</button>
                  <button onClick={() => del(p.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={13} /></button>
                </div>
              </div>
              {/* Quick test */}
              <div className="mt-3 flex gap-2">
                <input value={testInput} onChange={e => setTest(e.target.value)} placeholder="Test input..." className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white outline-none" />
                <button onClick={() => runTest(p.id)} disabled={testing} className="flex items-center gap-1 text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 px-3 py-1.5 rounded-lg disabled:opacity-50">
                  <Play size={10} /> Test
                </button>
              </div>
              {testResult && <div className="mt-2 bg-[#111] rounded-lg p-2 text-xs text-gray-300">{testResult}</div>}
            </div>
          ))}
          {prompts.length === 0 && <div className="text-center text-gray-500 py-12">No AI prompts yet.</div>}
        </div>
      )}
    </div>
  );
}
