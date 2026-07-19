import { useEffect, useState } from 'react';
import { Zap, Plus, Trash2, X, Play, ChevronRight, Toggle } from 'lucide-react';
import api from '../utils/api';

const TRIGGERS = ['message_received', 'payment_confirmed', 'lead_created', 'status_changed', 'tag_assigned', 'deal_moved', 'follow_up_sent'];
const CONDITION_OPS = ['equals', 'contains', 'gt', 'lt'];
const ACTION_TYPES = ['assign_tag', 'emit_activity', 'send_followup'];

export default function RuleEngine() {
  const [rules, setRules]     = useState([]);
  const [log, setLog]         = useState([]);
  const [creating, setCreating] = useState(false);
  const [tab, setTab]         = useState('rules');
  const [tags, setTags]       = useState([]);
  const [form, setForm]       = useState({
    name: '', trigger: 'message_received', conditions: [], actions: [], is_active: true,
  });

  const load = async () => {
    const [r, l, t] = await Promise.all([
      api.get('/rules'),
      api.get('/rules/log'),
      api.get('/tags'),
    ]);
    setRules(r.data);
    setLog(l.data);
    setTags(t.data);
  };

  useEffect(() => { load(); }, []);

  const addCondition = () => {
    setForm(f => ({ ...f, conditions: [...f.conditions, { field: 'content', op: 'contains', value: '' }] }));
  };

  const addAction = () => {
    setForm(f => ({ ...f, actions: [...f.actions, { type: 'emit_activity', title: '' }] }));
  };

  const saveRule = async () => {
    if (!form.name) return;
    await api.post('/rules', form);
    setCreating(false);
    setForm({ name: '', trigger: 'message_received', conditions: [], actions: [], is_active: true });
    load();
  };

  const toggleRule = async (rule) => {
    await api.put(`/rules/${rule.id}`, { ...rule, is_active: !rule.is_active });
    load();
  };

  const deleteRule = async (id) => {
    if (!confirm('Delete this rule?')) return;
    await api.delete(`/rules/${id}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Zap size={20} className="text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Rule Engine</h2>
        </div>
        <button onClick={() => setCreating(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
          <Plus size={14} /> New Rule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1 w-fit">
        {[['rules', 'Rules'], ['log', 'Execution Log']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Rules list */}
      {tab === 'rules' && (
        <div className="space-y-3">
          {rules.length === 0 && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-10 text-center text-gray-500">
              No rules yet. Create your first automation rule.
            </div>
          )}
          {rules.map(r => (
            <div key={r.id} className={`bg-[#1a1a1a] border rounded-xl p-4 ${r.is_active ? 'border-[#2a2a2a]' : 'border-[#2a2a2a] opacity-60'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{r.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Zap size={11} />
                    <span className="text-yellow-400">{r.trigger}</span>
                    {r.conditions?.length > 0 && <><ChevronRight size={11} /><span>{r.conditions.length} condition(s)</span></>}
                    <ChevronRight size={11} />
                    <span>{r.actions?.length || 0} action(s)</span>
                    {r.run_count > 0 && <span className="text-gray-600">· ran {r.run_count}×</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => toggleRule(r)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${r.is_active ? 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}>
                    {r.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => deleteRule(r.id)} className="text-gray-600 hover:text-red-400 p-1.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Execution log */}
      {tab === 'log' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {['Rule', 'Entity', 'Status', 'Time'].map(h => (
                  <th key={h} className="text-left text-gray-500 px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-500">No executions yet</td></tr>
              ) : log.map(l => (
                <tr key={l.id} className="border-b border-[#2a2a2a] hover:bg-white/5">
                  <td className="px-4 py-3 text-white">{l.rule_name || l.rule_id?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-400">{l.entity_type} · {l.entity_id?.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-1.5 py-0.5 rounded font-medium ${l.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {l.success ? 'passed' : 'failed'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{new Date(l.executed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create rule modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-lg my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Create Rule</h3>
              <button onClick={() => setCreating(false)}><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rule Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Tag leads mentioning pricing"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Trigger</label>
                <select value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                  {TRIGGERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Conditions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500">Conditions (optional)</label>
                  <button onClick={addCondition} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add</button>
                </div>
                {form.conditions.map((c, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={c.field} onChange={e => setForm(f => ({ ...f, conditions: f.conditions.map((cc, ii) => ii === i ? { ...cc, field: e.target.value } : cc) }))}
                      placeholder="field"
                      className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2 py-2 text-xs text-white focus:outline-none" />
                    <select value={c.op} onChange={e => setForm(f => ({ ...f, conditions: f.conditions.map((cc, ii) => ii === i ? { ...cc, op: e.target.value } : cc) }))}
                      className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2 py-2 text-xs text-white focus:outline-none">
                      {CONDITION_OPS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <input value={c.value} onChange={e => setForm(f => ({ ...f, conditions: f.conditions.map((cc, ii) => ii === i ? { ...cc, value: e.target.value } : cc) }))}
                      placeholder="value"
                      className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2 py-2 text-xs text-white focus:outline-none" />
                    <button onClick={() => setForm(f => ({ ...f, conditions: f.conditions.filter((_, ii) => ii !== i) }))} className="text-gray-600 hover:text-red-400">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500">Actions</label>
                  <button onClick={addAction} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add</button>
                </div>
                {form.actions.map((a, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={a.type} onChange={e => setForm(f => ({ ...f, actions: f.actions.map((aa, ii) => ii === i ? { ...aa, type: e.target.value } : aa) }))}
                      className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2 py-2 text-xs text-white focus:outline-none">
                      {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {a.type === 'assign_tag' && (
                      <select value={a.tag_id || ''} onChange={e => setForm(f => ({ ...f, actions: f.actions.map((aa, ii) => ii === i ? { ...aa, tag_id: e.target.value } : aa) }))}
                        className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2 py-2 text-xs text-white focus:outline-none">
                        <option value="">Select tag</option>
                        {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    )}
                    {a.type === 'emit_activity' && (
                      <input value={a.title || ''} onChange={e => setForm(f => ({ ...f, actions: f.actions.map((aa, ii) => ii === i ? { ...aa, title: e.target.value } : aa) }))}
                        placeholder="Activity title"
                        className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2 py-2 text-xs text-white focus:outline-none" />
                    )}
                    <button onClick={() => setForm(f => ({ ...f, actions: f.actions.filter((_, ii) => ii !== i) }))} className="text-gray-600 hover:text-red-400">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={saveRule} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Create Rule</button>
              <button onClick={() => setCreating(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
