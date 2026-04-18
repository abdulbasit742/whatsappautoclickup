import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Copy, Search } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../components/Toast';

const empty = { name: '', category: 'custom', content: '' };

const CAT_COLORS = {
  onboarding: 'bg-blue-500/20 text-blue-400',
  pricing:    'bg-emerald-500/20 text-emerald-400',
  payment:    'bg-purple-500/20 text-purple-400',
  followup:   'bg-yellow-500/20 text-yellow-400',
  review:     'bg-orange-500/20 text-orange-400',
  upsell:     'bg-pink-500/20 text-pink-400',
  custom:     'bg-gray-500/20 text-gray-400',
};

export default function Templates() {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(empty);
  const [editing, setEditing]     = useState(null);
  const [formErr, setFormErr]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    api.get('/templates')
      .then(r => setTemplates(r.data))
      .catch(() => toast('Failed to load templates', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const openAdd  = () => { setForm(empty); setEditing(null); setFormErr(''); setModal(true); };
  const openEdit = t  => { setForm(t); setEditing(t.id); setFormErr(''); setModal(true); };

  const save = async () => {
    if (!form.name?.trim()) { setFormErr('Template name is required'); return; }
    if (!form.content?.trim()) { setFormErr('Message content is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        const r = await api.put(`/templates/${editing}`, form);
        setTemplates(t => t.map(x => x.id === editing ? r.data : x));
        toast('Template updated', 'success');
      } else {
        const r = await api.post('/templates', form);
        setTemplates(t => [...t, r.data]);
        toast('Template created', 'success');
      }
      setModal(false);
    } catch (err) {
      setFormErr(err.response?.data?.error || 'Failed to save');
      toast('Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async t => {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    try {
      await api.delete(`/templates/${t.id}`);
      setTemplates(ts => ts.filter(x => x.id !== t.id));
      toast('Template deleted', 'success');
    } catch {
      toast('Failed to delete template', 'error');
    }
  };

  const copyContent = async t => {
    try {
      await navigator.clipboard.writeText(t.content);
      await api.post(`/templates/${t.id}/use`);
      setTemplates(ts => ts.map(x => x.id === t.id ? { ...x, usage_count: (x.usage_count || 0) + 1 } : x));
      toast('Copied to clipboard!', 'success');
    } catch {
      toast('Failed to copy', 'error');
    }
  };

  const maxUsage = Math.max(...templates.map(t => t.usage_count || 0), 0);

  const filtered = templates.filter(t => {
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q)
        || (t.category || '').toLowerCase().includes(q)
        || t.content.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Templates</h2>
          <p className="text-xs text-gray-500 mt-0.5">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 mb-5">
        <Search size={14} className="text-gray-500 shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates…"
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-12 text-center text-gray-500">
          {templates.length === 0 ? 'No templates yet — create your first one!' : 'No templates match your search.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#3a3a3a] transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white truncate">{t.name}</h3>
                    {maxUsage > 0 && (t.usage_count || 0) === maxUsage && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full shrink-0">🏆 Most Used</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${CAT_COLORS[t.category] || CAT_COLORS.custom}`}>
                      {t.category || 'custom'}
                    </span>
                    <span className="text-xs text-gray-600">Used {t.usage_count || 0}×</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-3 shrink-0">
                  <button onClick={() => copyContent(t)} title="Copy" className="text-gray-500 hover:text-blue-400 transition-colors"><Copy size={14} /></button>
                  <button onClick={() => openEdit(t)} title="Edit" className="text-gray-500 hover:text-emerald-400 transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => remove(t)} title="Delete" className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-3 line-clamp-3">
                {t.content.length > 120 ? t.content.slice(0, 120) + '…' : t.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-white mb-5">{editing ? 'Edit' : 'New'} Template</h3>

            {formErr && (
              <div className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {formErr}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Template Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Welcome Message"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                  {Object.keys(CAT_COLORS).map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Message Content *</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={6} placeholder="Type your template message…"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none" />
                <p className="text-xs text-gray-600 mt-1">Use <code className="text-emerald-500">{'{{client_name}}'}</code> for personalization</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="flex-1 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 py-2 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={save} disabled={saving}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

