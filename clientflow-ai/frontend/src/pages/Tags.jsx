import { useEffect, useState } from 'react';
import { Tag, Plus, Trash2, Palette } from 'lucide-react';
import api from '../utils/api';

const PRESET_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];
const ENTITY_TYPES  = ['contact','conversation','issue'];

export default function Tags() {
  const [tags, setTags]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [entityType, setEtype]  = useState('contact');
  const [form, setForm]         = useState({ name: '', color: '#6366f1', entity_type: 'contact' });
  const [showCreate, setShow]   = useState(false);

  const load = () => api.get(`/tags?entity_type=${entityType}`).then(r => setTags(r.data));

  useEffect(() => { load().finally(() => setLoading(false)); }, [entityType]);

  const createTag = async () => {
    await api.post('/tags', { ...form, entity_type: entityType });
    setShow(false);
    setForm({ name: '', color: '#6366f1' });
    await load();
  };

  const deleteTag = async (id) => {
    await api.delete(`/tags/${id}`);
    setTags(t => t.filter(x => x.id !== id));
  };

  if (loading) return <div className="text-gray-400">Loading tags...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Tag size={20} className="text-purple-400" /> Tag Manager</h2>
        <button onClick={() => setShow(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus size={14} /> New Tag
        </button>
      </div>

      {/* Entity type filter */}
      <div className="flex gap-2 mb-6">
        {ENTITY_TYPES.map(t => (
          <button key={t} onClick={() => setEtype(t)}
            className={`px-4 py-1.5 rounded-lg text-sm capitalize ${entityType === t ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {tags.map(tag => (
          <div key={tag.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
              <span className="text-sm text-white">{tag.name}</span>
            </div>
            <button onClick={() => deleteTag(tag.id)} className="text-gray-600 hover:text-red-400">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {tags.length === 0 && <div className="col-span-4 text-center text-gray-500 py-10">No tags yet.</div>}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-white mb-4">Create Tag</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Tag name" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none" />
              <div>
                <p className="text-xs text-gray-500 mb-2">Color</p>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-6 h-6 rounded-full ${form.color === c ? 'ring-2 ring-white' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShow(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={createTag} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
