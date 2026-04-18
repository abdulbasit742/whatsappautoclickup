import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../components/Toast';

const CATEGORIES = ['Marketing', 'Design', 'Development', 'AI Solutions', 'Automation', 'Content', 'Other'];
const empty = { name: '', description: '', price_pkr: '', delivery_days: 1, category: '' };

export default function Services() {
  const toast = useToast();
  const [services, setServices] = useState([]);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(empty);
  const [editing, setEditing]   = useState(null);
  const [formErr, setFormErr]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    api.get('/services')
      .then(r => setServices(r.data))
      .catch(() => toast('Failed to load services', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const openAdd  = () => { setForm(empty); setEditing(null); setFormErr(''); setModal(true); };
  const openEdit = s  => { setForm(s); setEditing(s.id); setFormErr(''); setModal(true); };

  const save = async () => {
    if (!form.name?.trim()) { setFormErr('Service name is required'); return; }
    if (form.price_pkr === '' || isNaN(Number(form.price_pkr)) || Number(form.price_pkr) < 0) {
      setFormErr('A valid price is required'); return;
    }
    if (!form.delivery_days || Number(form.delivery_days) < 1) {
      setFormErr('Delivery days must be at least 1'); return;
    }
    setSaving(true);
    try {
      if (editing) {
        const r = await api.put(`/services/${editing}`, form);
        setServices(s => s.map(x => x.id === editing ? r.data : x));
        toast('Service updated', 'success');
      } else {
        const r = await api.post('/services', form);
        setServices(s => [...s, r.data]);
        toast('Service added', 'success');
      }
      setModal(false);
    } catch (err) {
      setFormErr(err.response?.data?.error || 'Failed to save service');
      toast('Failed to save service', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async s => {
    try {
      const r = await api.put(`/services/${s.id}`, { is_active: !s.is_active });
      setServices(sv => sv.map(x => x.id === s.id ? r.data : x));
      toast(`Service ${!s.is_active ? 'activated' : 'deactivated'}`, 'success');
    } catch {
      toast('Failed to update status', 'error');
    }
  };

  const remove = async s => {
    if (!window.confirm(`Delete "${s.name}"? This will deactivate it.`)) return;
    try {
      await api.delete(`/services/${s.id}`);
      setServices(sv => sv.filter(x => x.id !== s.id));
      toast('Service removed', 'success');
    } catch {
      toast('Failed to delete service', 'error');
    }
  };

  const filtered = services.filter(s => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q);
  });

  const activeCount = services.filter(s => s.is_active).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Services</h2>
          <p className="text-xs text-gray-500 mt-0.5">{activeCount} active service{activeCount !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Service
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 mb-5">
        <Search size={14} className="text-gray-500 shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or category…"
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-12 text-center text-gray-500">
          {services.length === 0 ? 'No services yet — add your first one!' : 'No services match your search.'}
        </div>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-xs text-gray-500">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-center">Delivery</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{s.name}</p>
                    {s.description && <p className="text-xs text-gray-500 truncate max-w-[200px]">{s.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{s.category || '—'}</td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-semibold">
                    PKR {Number(s.price_pkr).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400">{s.delivery_days}d</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(s)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${s.is_active ? 'bg-emerald-500' : 'bg-[#2a2a2a]'}`}
                      title={s.is_active ? 'Deactivate' : 'Activate'}>
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${s.is_active ? 'translate-x-[18px]' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(s)} className="text-gray-500 hover:text-emerald-400 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => remove(s)} className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-white mb-5">{editing ? 'Edit' : 'Add'} Service</h3>

            {formErr && (
              <div className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {formErr}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Service Name *</label>
                <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. SEO Package"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Brief description…"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Price in PKR *</label>
                <input type="number" min="0" value={form.price_pkr || ''} onChange={e => setForm(f => ({ ...f, price_pkr: e.target.value }))}
                  placeholder="5000"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Delivery Days *</label>
                <input type="number" min="1" value={form.delivery_days || 1} onChange={e => setForm(f => ({ ...f, delivery_days: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <input list="cat-list" value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Marketing"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                <datalist id="cat-list">
                  {CATEGORIES.map(c => <option key={c} value={c} />)}
                </datalist>
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

