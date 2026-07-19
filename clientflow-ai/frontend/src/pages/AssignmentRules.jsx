import { useEffect, useState } from 'react';
import { UserCheck, Plus, Trash2, X, RefreshCw, Play } from 'lucide-react';
import api from '../utils/api';

const STRATEGIES = [
  { value: 'round_robin',   label: 'Round Robin',   desc: 'Assigns equally across all agents' },
  { value: 'load_balance',  label: 'Load Balance',  desc: 'Assigns to agent with least load' },
  { value: 'skill_based',   label: 'Skill-Based',   desc: 'Assigns based on required skill' },
];

const ENTITY_TYPES = ['lead', 'chat', 'issue'];

export default function AssignmentRules() {
  const [rules, setRules]   = useState([]);
  const [log, setLog]       = useState([]);
  const [team, setTeam]     = useState([]);
  const [tab, setTab]       = useState('rules');
  const [creating, setCreating] = useState(false);
  const [form, setForm]     = useState({ name: '', entity_type: 'lead', strategy: 'round_robin', conditions: {} });
  const [testResult, setTestResult] = useState(null);

  const load = async () => {
    const [r, l, t] = await Promise.all([
      api.get('/assignments/rules'),
      api.get('/assignments/log'),
      api.get('/team'),
    ]);
    setRules(r.data);
    setLog(l.data);
    setTeam(t.data);
  };

  useEffect(() => { load(); }, []);

  const createRule = async () => {
    if (!form.name) return;
    await api.post('/assignments/rules', form);
    setCreating(false);
    setForm({ name: '', entity_type: 'lead', strategy: 'round_robin', conditions: {} });
    load();
  };

  const deleteRule = async (id) => {
    await api.delete(`/assignments/rules/${id}`); load();
  };

  const testAssign = async (ruleId) => {
    try {
      const r = await api.post('/assignments/assign', { entity_type: 'test', entity_id: 'test-123', rule_id: ruleId });
      setTestResult({ ruleId, member: r.data.assigned_to });
    } catch (e) {
      setTestResult({ ruleId, error: e.response?.data?.error || e.message });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UserCheck size={20} className="text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Smart Assignment Engine</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={load}><RefreshCw size={14} className="text-gray-500 hover:text-gray-300" /></button>
          <button onClick={() => setCreating(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
            <Plus size={14} /> New Rule
          </button>
        </div>
      </div>

      {/* Team overview */}
      {team.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {team.map(m => (
            <div key={m.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
                  {m.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.role}</p>
                </div>
              </div>
              <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (m.current_load / m.max_load) * 100)}%` }} />
              </div>
              <p className="text-xs text-gray-600 mt-1">{m.current_load}/{m.max_load} load</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1 w-fit">
        {[['rules', 'Assignment Rules'], ['log', 'Assignment Log']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Rules */}
      {tab === 'rules' && (
        <div className="space-y-3">
          {rules.length === 0 && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500">No assignment rules yet</div>
          )}
          {rules.map(r => {
            const strategy = STRATEGIES.find(s => s.value === r.strategy);
            return (
              <div key={r.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{r.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{r.entity_type}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">{r.strategy}</span>
                    </div>
                    {strategy && <p className="text-xs text-gray-500">{strategy.desc}</p>}
                    {r.conditions?.required_skill && (
                      <p className="text-xs text-gray-500 mt-0.5">Required skill: <span className="text-white">{r.conditions.required_skill}</span></p>
                    )}
                    {testResult?.ruleId === r.id && (
                      <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${testResult.error ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {testResult.error ? `Error: ${testResult.error}` : `Would assign to: ${testResult.member?.name}`}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => testAssign(r.id)}
                      className="text-xs text-gray-400 hover:text-emerald-400 border border-[#2a2a2a] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                      <Play size={11} /> Test
                    </button>
                    <button onClick={() => deleteRule(r.id)} className="text-gray-600 hover:text-red-400 p-1.5">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log */}
      {tab === 'log' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {['Assigned To', 'Entity Type', 'Entity', 'Time'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-500 px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-500">No assignments yet</td></tr>
              ) : log.map(l => (
                <tr key={l.id} className="border-b border-[#2a2a2a] hover:bg-white/5">
                  <td className="px-4 py-3 text-white">{l.member_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{l.entity_type}</td>
                  <td className="px-4 py-3 text-gray-400">{l.entity_id?.slice(0, 12)}...</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create rule modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">New Assignment Rule</h3>
              <button onClick={() => setCreating(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Rule name *"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Entity Type</label>
                  <select value={form.entity_type} onChange={e => setForm(f => ({ ...f, entity_type: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                    {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Strategy</label>
                  <select value={form.strategy} onChange={e => setForm(f => ({ ...f, strategy: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                    {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              {form.strategy === 'skill_based' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Required Skill</label>
                  <input value={form.conditions?.required_skill || ''} onChange={e => setForm(f => ({ ...f, conditions: { ...f.conditions, required_skill: e.target.value } }))}
                    placeholder="e.g. sales, billing, support"
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
                </div>
              )}
              <div className="bg-[#0f0f0f] rounded-xl p-3 text-xs text-gray-500">
                {STRATEGIES.find(s => s.value === form.strategy)?.desc}
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={createRule} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Create</button>
              <button onClick={() => setCreating(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
