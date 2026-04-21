import { useEffect, useState } from 'react';
import { Plus, Eye, EyeOff, Edit, Trash2, X, Tag } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';

const emptyForm = { title: '', customer_name: '', logo_url: '', problem: '', solution: '', results: '', tags: '' };

export default function CaseStudies() {
  const [items, setItems]     = useState([]);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/case-studies').then(r => setItems(r.data));

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const save = async () => {
    if (!form.title.trim()) return alert('Title required');
    try {
      if (editing) {
        const r = await api.put(`/case-studies/${editing}`, form);
        setItems(i => i.map(x => x.id === editing ? r.data : x));
      } else {
        const r = await api.post('/case-studies', form);
        setItems(i => [r.data, ...i]);
      }
      setModal(false); setForm(emptyForm); setEditing(null);
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const del = async (id) => {
    if (!confirm('Delete this case study?')) return;
    await api.delete(`/case-studies/${id}`);
    setItems(i => i.filter(x => x.id !== id));
  };

  const togglePublish = async (item) => {
    if (item.is_published) {
      const r = await api.put(`/case-studies/${item.id}/unpublish`);
      setItems(i => i.map(x => x.id === item.id ? r.data : x));
    } else {
      const r = await api.put(`/case-studies/${item.id}/publish`);
      setItems(i => i.map(x => x.id === item.id ? r.data : x));
    }
  };

  const startEdit = (item) => {
    setForm({ title: item.title, customer_name: item.customer_name || '', logo_url: item.logo_url || '', problem: item.problem || '', solution: item.solution || '', results: item.results || '', tags: item.tags || '' });
    setEditing(item.id); setModal(true);
  };

  if (loading) return <div className="text-gray-400">Loading case studies...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Case Studies</h2>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setModal(true); }} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> New Case Study
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.length === 0 && (
          <div className="col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500">No case studies yet.</div>
        )}
        {items.map(item => (
          <div key={item.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">{item.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{item.customer_name}</p>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${item.is_published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {item.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
            {item.tags && (
              <div className="flex flex-wrap gap-1 mb-3">
                {item.tags.split(',').map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                    <Tag size={9} /> {tag.trim()}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mb-3">{format(new Date(item.created_at), 'dd MMM yyyy')}</p>
            <div className="flex gap-2">
              <button onClick={() => setViewing(item)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] px-2 py-1 rounded-lg">
                <Eye size={11} /> View
              </button>
              <button onClick={() => startEdit(item)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-400/20 px-2 py-1 rounded-lg">
                <Edit size={11} /> Edit
              </button>
              <button onClick={() => togglePublish(item)} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 border border-purple-400/20 px-2 py-1 rounded-lg">
                {item.is_published ? <EyeOff size={11} /> : <Eye size={11} />} {item.is_published ? 'Unpublish' : 'Publish'}
              </button>
              <button onClick={() => del(item.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-400/20 px-2 py-1 rounded-lg ml-auto">
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit/Create Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">{editing ? 'Edit' : 'New'} Case Study</h3>
              <button onClick={() => { setModal(false); setEditing(null); }} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['title','Title','SaaS Company Grew 3x'],['customer_name','Customer Name','Acme Corp'],['logo_url','Logo URL','https://...'],['tags','Tags (comma-separated)','growth, ai, whatsapp']].map(([k,l,ph]) => (
                <div key={k} className={k === 'title' || k === 'tags' ? 'col-span-2' : ''}>
                  <label className="block text-xs text-gray-400 mb-1">{l}</label>
                  <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    placeholder={ph}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"/>
                </div>
              ))}
              {[['problem','Problem','What challenge did the customer face?'],['solution','Solution','How did you solve it?'],['results','Results','Quantified outcomes...']].map(([k,l,ph]) => (
                <div key={k} className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">{l}</label>
                  <textarea value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    placeholder={ph} rows={3}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"/>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setModal(false); setEditing(null); }} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={save} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">{viewing.title}</h3>
              <button onClick={() => setViewing(null)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Customer: {viewing.customer_name}</p>
            {[['Problem', viewing.problem], ['Solution', viewing.solution], ['Results', viewing.results]].map(([label, content]) => content && (
              <div key={label} className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 mb-1 uppercase">{label}</h4>
                <p className="text-sm text-gray-200">{content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
