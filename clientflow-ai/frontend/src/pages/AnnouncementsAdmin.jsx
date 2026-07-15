import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { useToast } from '../components/Toast';
import api from '../utils/api';

const TYPES = ['info','warning','error','success','maintenance'];
const TYPE_COLORS = { info:'text-blue-400', warning:'text-yellow-400', error:'text-red-400', success:'text-emerald-400', maintenance:'text-orange-400' };
const USER_ID = 'demo-user';

export default function AnnouncementsAdmin() {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title:'', body:'', type:'info', target_plan:'', ends_at:'' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    try {
      const r = await api.get(`/announcements?user_id=${USER_ID}`);
      setItems(r.data);
    } catch {}
  }
  useEffect(() => { load(); }, []);

  function set(k,v) { setForm(f=>({...f,[k]:v})); }
  function openCreate() { setForm({ title:'', body:'', type:'info', target_plan:'', ends_at:'' }); setEditing(null); setShowForm(true); }
  function openEdit(a) { setForm({ title:a.title, body:a.body, type:a.type, target_plan:a.target_plan||'', ends_at:a.ends_at?a.ends_at.split('T')[0]:'' }); setEditing(a.id); setShowForm(true); }

  async function save() {
    try {
      if (editing) {
        await api.put(`/announcements/${editing}`, { ...form, is_active: true });
        showToast('Updated!', 'success');
      } else {
        await api.post('/announcements', { ...form, created_by: USER_ID });
        showToast('Created!', 'success');
      }
      setShowForm(false); load();
    } catch { showToast('Error saving', 'error'); }
  }

  async function deactivate(id) {
    await api.delete(`/announcements/${id}`);
    showToast('Deactivated', 'success'); load();
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Announcements</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={14}/> New Announcement
        </button>
      </div>

      <div className="space-y-3">
        {items.map(a => (
          <div key={a.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-start gap-4">
            <span className={`text-xs px-2 py-0.5 rounded-full bg-[#2a2a2a] font-medium mt-0.5 ${TYPE_COLORS[a.type]}`}>{a.type}</span>
            <div className="flex-1">
              <div className="text-white font-medium text-sm">{a.title}</div>
              <div className="text-gray-400 text-sm mt-0.5">{a.body}</div>
              {a.ends_at && <div className="text-xs text-gray-600 mt-1">Expires: {new Date(a.ends_at).toLocaleDateString()}</div>}
              {a.dismissed && <span className="text-xs text-gray-600 italic">dismissed</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(a)} className="text-gray-400 hover:text-white transition-colors"><Pencil size={13}/></button>
              <button onClick={() => deactivate(a.id)} className="text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={13}/></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-gray-500 text-sm">No announcements.</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">{editing?'Edit':'New'} Announcement</h2>
              <button onClick={()=>setShowForm(false)}><X size={15} className="text-gray-400"/></button>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Title</label>
              <input value={form.title} onChange={e=>set('title',e.target.value)} className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"/>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Body</label>
              <textarea value={form.body} onChange={e=>set('body',e.target.value)} rows={3} className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Type</label>
                <select value={form.type} onChange={e=>set('type',e.target.value)} className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
                  {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Expires</label>
                <input type="date" value={form.ends_at} onChange={e=>set('ends_at',e.target.value)} className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"/>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={save} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">Save</button>
              <button onClick={()=>setShowForm(false)} className="px-5 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white text-sm rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
