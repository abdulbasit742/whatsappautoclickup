import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Search, Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { useToast } from '../components/Toast';
import api from '../utils/api';

export default function FAQs() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [q, setQ] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [adminMode] = useState(true);
  const [form, setForm] = useState({ question:'', answer:'', category_id:'', sort_order: 0 });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    try {
      const [cats, faqData] = await Promise.all([
        api.get('/faqs/categories').then(r => r.data),
        api.get(`/faqs${q||selectedCat ? '?'+(q?`q=${q}&`:'')+( selectedCat?`category_id=${selectedCat}`:''): ''}`).then(r => r.data),
      ]);
      setCategories(cats);
      setFaqs(faqData);
    } catch {}
  }

  useEffect(() => { load(); }, [q, selectedCat]);

  function setF(k,v) { setForm(f => ({...f, [k]: v})); }

  function openCreate() { setForm({ question:'', answer:'', category_id: selectedCat||'', sort_order: faqs.length }); setEditId(null); setShowForm(true); }
  function openEdit(faq) { setForm({ question: faq.question, answer: faq.answer, category_id: faq.category_id||'', sort_order: faq.sort_order||0 }); setEditId(faq.id); setShowForm(true); }

  async function save() {
    try {
      if (editId) { await api.put(`/faqs/${editId}`, { ...form, is_published: true }); showToast('Updated!', 'success'); }
      else { await api.post('/faqs', form); showToast('Created!', 'success'); }
      setShowForm(false); load();
    } catch { showToast('Error saving FAQ', 'error'); }
  }

  async function del(id) {
    if (!confirm('Delete this FAQ?')) return;
    await api.delete(`/faqs/${id}`);
    showToast('Deleted', 'success'); load();
  }

  const grouped = categories.reduce((acc, cat) => {
    acc[cat.id] = { cat, items: faqs.filter(f => f.category_id === cat.id) };
    return acc;
  }, {});
  const uncategorized = faqs.filter(f => !f.category_id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">FAQs</h1>
        {adminMode && <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"><Plus size={14}/> Add FAQ</button>}
      </div>

      {/* Search + filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search FAQs..."
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500" />
        </div>
        <select value={selectedCat||''} onChange={e => setSelectedCat(e.target.value||null)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* FAQ list */}
      {faqs.length === 0 && <p className="text-gray-500 text-sm">No FAQs found.</p>}

      {!q && !selectedCat ? (
        // Grouped by category
        <>
          {Object.values(grouped).filter(g => g.items.length > 0).map(({ cat, items }) => (
            <div key={cat.id}>
              <h2 className="text-white font-semibold text-sm mb-2 uppercase tracking-wide text-gray-500">{cat.name}</h2>
              <div className="space-y-2">{items.map(faq => <FAQItem key={faq.id} faq={faq} expanded={expanded} setExpanded={setExpanded} adminMode={adminMode} onEdit={openEdit} onDel={del}/>)}</div>
            </div>
          ))}
          {uncategorized.length > 0 && (
            <div>
              <h2 className="text-gray-500 text-sm font-semibold mb-2 uppercase tracking-wide">Other</h2>
              <div className="space-y-2">{uncategorized.map(faq => <FAQItem key={faq.id} faq={faq} expanded={expanded} setExpanded={setExpanded} adminMode={adminMode} onEdit={openEdit} onDel={del}/>)}</div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">{faqs.map(faq => <FAQItem key={faq.id} faq={faq} expanded={expanded} setExpanded={setExpanded} adminMode={adminMode} onEdit={openEdit} onDel={del}/>)}</div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-white font-semibold">{editId ? 'Edit' : 'Add'} FAQ</h2>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Category</label>
              <select value={form.category_id} onChange={e => setF('category_id', e.target.value)}
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
                <option value="">Uncategorized</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Question</label>
              <input value={form.question} onChange={e => setF('question', e.target.value)}
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Answer</label>
              <textarea value={form.answer} onChange={e => setF('answer', e.target.value)} rows={4}
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-y" />
            </div>
            <div className="flex gap-3">
              <button onClick={save} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">Save</button>
              <button onClick={() => setShowForm(false)} className="px-5 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white text-sm rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FAQItem({ faq, expanded, setExpanded, adminMode, onEdit, onDel }) {
  const isOpen = expanded === faq.id;
  return (
    <div className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden transition-colors ${isOpen ? 'border-emerald-500/30' : ''}`}>
      <button onClick={() => setExpanded(isOpen ? null : faq.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left">
        <span className="text-white text-sm font-medium pr-4">{faq.question}</span>
        <div className="flex items-center gap-2 shrink-0">
          {adminMode && (
            <>
              <span onClick={e => { e.stopPropagation(); onEdit(faq); }} className="text-gray-500 hover:text-white transition-colors cursor-pointer"><Pencil size={12}/></span>
              <span onClick={e => { e.stopPropagation(); onDel(faq.id); }} className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer"><Trash2 size={12}/></span>
            </>
          )}
          {isOpen ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-sm text-gray-300 leading-relaxed border-t border-[#2a2a2a] pt-3">{faq.answer}</div>
      )}
    </div>
  );
}
