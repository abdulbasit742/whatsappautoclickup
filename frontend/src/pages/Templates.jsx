import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Copy } from 'lucide-react';
import api from '../utils/api';

const empty = { name: '', category: '', content: '' };

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(empty);
  const [editing, setEditing]     = useState(null);

  useEffect(() => {
    api.get('/templates').then(r => setTemplates(r.data));
  }, []);

  const openAdd  = () => { setForm(empty); setEditing(null); setModal(true); };
  const openEdit = t  => { setForm(t); setEditing(t.id); setModal(true); };

  const save = async () => {
    if (editing) {
      const r = await api.put(`/templates/${editing}`, form);
      setTemplates(t => t.map(x => x.id === editing ? r.data : x));
    } else {
      const r = await api.post('/templates', form);
      setTemplates(t => [...t, r.data]);
    }
    setModal(false);
  };

  const remove = async id => {
    await api.delete(`/templates/${id}`);
    setTemplates(t => t.filter(x => x.id !== id));
  };

  const copyContent = async t => {
    navigator.clipboard.writeText(t.content);
    await api.post(`/templates/${t.id}/use`);
    setTemplates(ts => ts.map(x => x.id === t.id ? { ...x, usage_count: x.usage_count + 1 } : x));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Templates</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(t => (
          <div key={t.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-white">{t.name}</h3>
                <span className="text-xs text-gray-500">{t.category} · used {t.usage_count}×</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyContent(t)} className="text-gray-500 hover:text-blue-400" title="Copy"><Copy size={14} /></button>
                <button onClick={() => openEdit(t)} className="text-gray-500 hover:text-emerald-400"><Pencil size={14} /></button>
                <button onClick={() => remove(t.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
            <p className="text-sm text-gray-400 line-clamp-3">{t.content}</p>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg">
            <h3 className="font-semibold text-white mb-4">{editing ? 'Edit' : 'New'} Template</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Content</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={5} className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={save} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
