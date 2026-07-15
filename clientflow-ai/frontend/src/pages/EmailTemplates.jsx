import { useState, useEffect } from 'react';
import { Plus, Eye, Send, Pencil, Trash2, X } from 'lucide-react';
import { useToast } from '../components/Toast';
import api from '../utils/api';

const TYPES = ['invite','password_reset','billing','notification','onboarding'];
const ORG_ID = 'demo-org';

const DEFAULT_TEMPLATE = {
  type: 'invite', name: '', subject: '',
  html_body: '<p>Hello {{name}},</p><p>{{message}}</p><p>Click <a href="{{link}}">here</a> to get started.</p>',
  variables: ['name','message','link']
};

export default function EmailTemplates() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(DEFAULT_TEMPLATE);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewVars, setPreviewVars] = useState({});
  const [filterType, setFilterType] = useState('');
  const [testEmail, setTestEmail] = useState('');

  async function load() {
    try {
      const r = await api.get(`/email-templates?org_id=${ORG_ID}${filterType ? `&type=${filterType}` : ''}`);
      setTemplates(r.data);
    } catch {}
  }

  useEffect(() => { load(); }, [filterType]);

  function openCreate() { setForm(DEFAULT_TEMPLATE); setEditing(null); setShowForm(true); }
  function openEdit(t) { setForm({ ...t, variables: t.variables || [] }); setEditing(t.id); setShowForm(true); }
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    try {
      if (editing) { await api.put(`/email-templates/${editing}`, form); showToast('Updated!', 'success'); }
      else { await api.post('/email-templates', { ...form, org_id: ORG_ID }); showToast('Created!', 'success'); }
      setShowForm(false); load();
    } catch { showToast('Error saving template', 'error'); }
  }

  async function del(id) {
    if (!confirm('Delete this template?')) return;
    await api.delete(`/email-templates/${id}`);
    showToast('Deleted', 'success'); load();
  }

  async function showPreview(t) {
    const vars = {};
    (t.variables || []).forEach(v => { vars[v] = `[${v}]`; });
    try {
      const r = await api.post(`/email-templates/${t.id}/preview`, { variables: vars });
      setPreview(r.data); setPreviewVars(vars);
    } catch { showToast('Preview error', 'error'); }
  }

  async function sendTest(id) {
    if (!testEmail) return showToast('Enter test email', 'error');
    try {
      await api.post(`/email-templates/${id}/test-send`, { to: testEmail });
      showToast(`Test sent to ${testEmail}`, 'success');
    } catch { showToast('Error sending test', 'error'); }
  }

  const typeColor = { invite:'bg-blue-500/10 text-blue-400', password_reset:'bg-purple-500/10 text-purple-400', billing:'bg-yellow-500/10 text-yellow-400', notification:'bg-emerald-500/10 text-emerald-400', onboarding:'bg-pink-500/10 text-pink-400' };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Email Templates</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={14} /> New Template
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterType('')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!filterType ? 'bg-emerald-500 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'}`}>All</button>
        {TYPES.map(t => (
          <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${filterType===t ? 'bg-emerald-500 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'}`}>
            {t.replace('_',' ')}
          </button>
        ))}
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(t => (
          <div key={t.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-white font-medium text-sm">{t.name}</div>
                <div className="text-gray-500 text-xs mt-0.5">{t.subject}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${typeColor[t.type] || 'bg-gray-500/10 text-gray-400'}`}>{t.type.replace('_',' ')}</span>
            </div>
            {(t.variables || []).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(t.variables || []).map(v => (
                  <span key={v} className="text-xs bg-[#2a2a2a] text-gray-400 px-2 py-0.5 rounded">{`{{${v}}}`}</span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1 border-t border-[#2a2a2a]">
              <button onClick={() => showPreview(t)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                <Eye size={12} /> Preview
              </button>
              <div className="flex items-center gap-1 ml-2">
                <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="text-xs bg-[#2a2a2a] border border-[#3a3a3a] rounded px-2 py-0.5 text-white w-36 focus:outline-none" />
                <button onClick={() => sendTest(t.id)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  <Send size={11} /> Test
                </button>
              </div>
              <div className="ml-auto flex gap-2">
                <button onClick={() => openEdit(t)} className="text-gray-400 hover:text-white transition-colors"><Pencil size={13} /></button>
                {!t.is_default && <button onClick={() => del(t.id)} className="text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>}
              </div>
            </div>
          </div>
        ))}
        {templates.length === 0 && <p className="text-gray-500 text-sm col-span-2">No templates yet. Create one!</p>}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
              <h2 className="text-white font-semibold">{editing ? 'Edit' : 'New'} Email Template</h2>
              <button onClick={() => setShowForm(false)}><X size={16} className="text-gray-400 hover:text-white" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Name</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Type</label>
                  <select value={form.type} onChange={e => set('type', e.target.value)} className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
                    {TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Subject</label>
                <input value={form.subject} onChange={e => set('subject', e.target.value)} className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">HTML Body</label>
                <textarea value={form.html_body} onChange={e => set('html_body', e.target.value)} rows={8} className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 resize-y" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Variables (comma-separated)</label>
                <input
                  value={(form.variables || []).join(',')}
                  onChange={e => set('variables', e.target.value.split(',').map(s=>s.trim()).filter(Boolean))}
                  className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="name, email, link" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={save} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">Save Template</button>
                <button onClick={() => setShowForm(false)} className="px-5 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white text-sm rounded-lg transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-gray-800 font-semibold">Preview: {preview.subject}</h2>
              <button onClick={() => setPreview(null)}><X size={16} className="text-gray-500 hover:text-gray-800" /></button>
            </div>
            <div className="p-4" dangerouslySetInnerHTML={{ __html: preview.html }} />
          </div>
        </div>
      )}
    </div>
  );
}
