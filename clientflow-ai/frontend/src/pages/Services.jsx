import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../utils/api';

const empty = { name: '', description: '', price_pkr: '', delivery_days: 1, category: '' };

export default function Services() {
  const [services, setServices] = useState([]);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(empty);
  const [editing, setEditing]   = useState(null);

  useEffect(() => {
    api.get('/services').then(r => setServices(r.data));
  }, []);

  const openAdd  = () => { setForm(empty); setEditing(null); setModal(true); };
  const openEdit = s  => { setForm(s); setEditing(s.id); setModal(true); };

  const save = async () => {
    if (editing) {
      const r = await api.put(`/services/${editing}`, form);
      setServices(s => s.map(x => x.id === editing ? r.data : x));
    } else {
      const r = await api.post('/services', form);
      setServices(s => [...s, r.data]);
    }
    setModal(false);
  };

  const remove = async id => {
    await api.delete(`/services/${id}`);
    setServices(s => s.filter(x => x.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Services</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Service
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map(s => (
          <div key={s.id} className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 ${!s.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-white">{s.name}</h3>
                <span className="text-xs text-gray-500">{s.category}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(s)} className="text-gray-500 hover:text-emerald-400"><Pencil size={14} /></button>
                <button onClick={() => remove(s.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-3">{s.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-semibold">PKR {Number(s.price_pkr).toLocaleString()}</span>
              <span className="text-xs text-gray-500">{s.delivery_days} day(s)</span>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-white mb-4">{editing ? 'Edit' : 'Add'} Service</h3>
            <div className="space-y-3">
              {[['name','Name'],['category','Category'],['description','Description'],['price_pkr','Price (PKR)'],['delivery_days','Delivery Days']].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <input
                    value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
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
