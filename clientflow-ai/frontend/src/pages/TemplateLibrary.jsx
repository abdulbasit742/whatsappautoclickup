import { useEffect, useState } from 'react';
import { BookOpen, Plus, Heart, Star, Trash2, Eye } from 'lucide-react';
import api from '../utils/api';

const TYPES      = ['message','followup','email','issue_reply','campaign'];
const TYPE_ICONS = { message: '💬', followup: '🔔', email: '📧', issue_reply: '🐛', campaign: '📣' };

export default function TemplateLibrary() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [typeFilter, setType]     = useState('');
  const [showCreate, setShow]     = useState(false);
  const [preview, setPreview]     = useState(null);
  const [form, setForm]           = useState({ name: '', type: 'message', category: '', content: '', variables: '' });

  const load = () => {
    const q = typeFilter ? `?type=${typeFilter}` : '';
    return api.get(`/template-library${q}`).then(r => setTemplates(r.data));
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, [typeFilter]);

  const create = async () => {
    const vars = form.variables.split(',').map(s => s.trim()).filter(Boolean);
    await api.post('/template-library', { ...form, variables: vars });
    setShow(false);
    setForm({ name: '', type: 'message', category: '', content: '', variables: '' });
    await load();
  };

  const toggleFav = async (id) => {
    await api.put(`/template-library/${id}/favorite`);
    setTemplates(t => t.map(x => x.id === id ? { ...x, is_favorite: !x.is_favorite } : x));
  };

  const del = async (id) => {
    await api.delete(`/template-library/${id}`);
    setTemplates(t => t.filter(x => x.id !== id));
  };

  if (loading) return <div className="text-gray-400">Loading templates...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><BookOpen size={20} className="text-blue-400" /> Template Library</h2>
        <button onClick={() => setShow(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus size={14} /> New Template
        </button>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setType('')} className={`px-3 py-1.5 rounded-lg text-sm ${!typeFilter ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>All</button>
        {TYPES.map(t => (
          <button key={t} onClick={() => setType(t)} className={`px-3 py-1.5 rounded-lg text-sm ${typeFilter === t ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
            {TYPE_ICONS[t]} {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(t => (
          <div key={t.id} className={`bg-[#1a1a1a] border rounded-xl p-4 ${t.is_favorite ? 'border-yellow-500/30' : 'border-[#2a2a2a]'}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{TYPE_ICONS[t.type]}</span>
                  <span className="text-white font-medium text-sm">{t.name}</span>
                  {t.is_default && <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 rounded">Default</span>}
                </div>
                {t.category && <span className="text-xs text-gray-500">{t.category}</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setPreview(t)} className="p-1 text-gray-500 hover:text-white"><Eye size={13} /></button>
                <button onClick={() => toggleFav(t.id)} className={`p-1 ${t.is_favorite ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'}`}><Star size={13} /></button>
                <button onClick={() => del(t.id)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={13} /></button>
              </div>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2">{t.content}</p>
            {t.variables?.length > 0 && (
              <div className="mt-2 flex gap-1 flex-wrap">
                {t.variables.map(v => <span key={v} className="text-xs bg-[#2a2a2a] text-gray-400 px-1.5 py-0.5 rounded">{`{{${v}}}`}</span>)}
              </div>
            )}
          </div>
        ))}
        {templates.length === 0 && <div className="col-span-2 text-center text-gray-500 py-12">No templates yet.</div>}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setPreview(null)}>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-3">
              <h3 className="font-semibold text-white">{preview.name}</h3>
              <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-white text-xs">✕</button>
            </div>
            <div className="bg-[#111] rounded-xl p-4 text-sm text-gray-300 whitespace-pre-wrap">{preview.content}</div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg">
            <h3 className="font-semibold text-white mb-4">Create Template</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Template name" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none" />
              <div className="flex gap-3">
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none">
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Category" className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none" />
              </div>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={5} placeholder="Template content. Use {{variable}} for variables." className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none resize-none" />
              <input value={form.variables} onChange={e => setForm(f => ({ ...f, variables: e.target.value }))} placeholder="Variables (comma-separated): name, date, amount" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none" />
              <div className="flex gap-3">
                <button onClick={() => setShow(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={create} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
