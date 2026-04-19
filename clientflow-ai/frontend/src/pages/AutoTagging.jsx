import { useEffect, useState } from 'react';
import { Tag, Plus, Trash2, X, RefreshCw } from 'lucide-react';
import api from '../utils/api';

export default function AutoTagging() {
  const [tags, setTags]         = useState([]);
  const [rules, setRules]       = useState([]);
  const [tab, setTab]           = useState('tags');
  const [addingTag, setAddingTag]   = useState(false);
  const [addingRule, setAddingRule] = useState(false);
  const [tagForm, setTagForm]   = useState({ name: '', color: '#10b981' });
  const [ruleForm, setRuleForm] = useState({ name: '', tag_id: '', conditions: { keyword: '', source: '' } });

  const load = async () => {
    const [t, r] = await Promise.all([api.get('/tags'), api.get('/tags/rules')]);
    setTags(t.data);
    setRules(r.data);
  };

  useEffect(() => { load(); }, []);

  const createTag = async () => {
    if (!tagForm.name) return;
    await api.post('/tags', tagForm);
    setAddingTag(false); setTagForm({ name: '', color: '#10b981' }); load();
  };

  const deleteTag = async (id) => {
    await api.delete(`/tags/${id}`); load();
  };

  const createRule = async () => {
    if (!ruleForm.name || !ruleForm.tag_id) return;
    await api.post('/tags/rules', ruleForm);
    setAddingRule(false); setRuleForm({ name: '', tag_id: '', conditions: { keyword: '', source: '' } }); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Tag size={20} className="text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Auto-Tagging Engine</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={load}><RefreshCw size={14} className="text-gray-500 hover:text-gray-300" /></button>
          {tab === 'tags' ? (
            <button onClick={() => setAddingTag(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
              <Plus size={14} /> New Tag
            </button>
          ) : (
            <button onClick={() => setAddingRule(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
              <Plus size={14} /> New Rule
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1 w-fit">
        {[['tags', 'Tags'], ['rules', 'Auto-Tag Rules']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tags list */}
      {tab === 'tags' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tags.length === 0 && (
            <div className="col-span-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500">No tags yet</div>
          )}
          {tags.map(t => (
            <div key={t.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <span className="text-sm font-medium text-white">{t.name}</span>
                </div>
                <button onClick={() => deleteTag(t.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rules list */}
      {tab === 'rules' && (
        <div className="space-y-3">
          {rules.length === 0 && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500">No auto-tag rules yet</div>
          )}
          {rules.map(r => (
            <div key={r.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{r.name}</span>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color || '#10b981' }} />
                    <span className="text-xs text-emerald-400">{r.tag_name}</span>
                  </div>
                  {r.conditions?.keyword && (
                    <p className="text-xs text-gray-500">Keyword: <span className="text-gray-300">"{r.conditions.keyword}"</span></p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {r.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Tag modal */}
      {addingTag && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">New Tag</h3>
              <button onClick={() => setAddingTag(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={tagForm.name} onChange={e => setTagForm(f => ({ ...f, name: e.target.value }))} placeholder="Tag name *"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
              <div className="flex items-center gap-3">
                <input type="color" value={tagForm.color} onChange={e => setTagForm(f => ({ ...f, color: e.target.value }))}
                  className="h-10 w-20 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg cursor-pointer" />
                <input value={tagForm.color} onChange={e => setTagForm(f => ({ ...f, color: e.target.value }))}
                  className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={createTag} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Create</button>
              <button onClick={() => setAddingTag(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Rule modal */}
      {addingRule && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">New Auto-Tag Rule</h3>
              <button onClick={() => setAddingRule(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} placeholder="Rule name *"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Assign Tag</label>
                <select value={ruleForm.tag_id} onChange={e => setRuleForm(f => ({ ...f, tag_id: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                  <option value="">Select tag...</option>
                  {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Trigger Keyword</label>
                <input value={ruleForm.conditions.keyword} onChange={e => setRuleForm(f => ({ ...f, conditions: { ...f.conditions, keyword: e.target.value } }))}
                  placeholder="e.g. price, discount, help"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={createRule} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Create Rule</button>
              <button onClick={() => setAddingRule(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
