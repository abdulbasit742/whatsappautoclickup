import { useEffect, useState } from 'react';
import { Filter, Plus, Trash2, Save, X, Users, Play } from 'lucide-react';
import api from '../utils/api';

const OPERATORS = ['equals', 'contains', 'gt', 'lt', 'is_null', 'is_not_null'];
const FIELDS = ['name', 'status', 'email', 'total_spent_pkr', 'created_at', 'last_active_at'];

export default function FilterBuilder() {
  const [saved, setSaved]       = useState([]);
  const [conditions, setConditions] = useState([]);
  const [operator, setOperator] = useState('AND');
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving]     = useState(false);

  const load = async () => {
    const r = await api.get('/filters', { params: { entity_type: 'clients' } });
    setSaved(r.data);
  };

  useEffect(() => { load(); }, []);

  const addCondition = () => {
    setConditions(prev => [...prev, { id: Date.now(), field: 'name', op: 'contains', value: '' }]);
  };

  const updateCondition = (id, key, val) => {
    setConditions(prev => prev.map(c => c.id === id ? { ...c, [key]: val } : c));
  };

  const removeCondition = (id) => {
    setConditions(prev => prev.filter(c => c.id !== id));
  };

  const applyFilter = async () => {
    setLoading(true);
    try {
      const r = await api.post('/filters/apply', { filter_json: { operator, conditions } });
      setResults(r.data);
    } finally { setLoading(false); }
  };

  const saveFilter = async () => {
    if (!saveName) return;
    setSaving(true);
    await api.post('/filters', { name: saveName, entity_type: 'clients', filter_json: { operator, conditions } });
    setSaveName('');
    setSaving(false);
    load();
  };

  const loadFilter = (f) => {
    const { conditions: conds, operator: op } = f.filter_json || {};
    setConditions((conds || []).map(c => ({ ...c, id: Date.now() + Math.random() })));
    setOperator(op || 'AND');
    setResults(null);
  };

  const deleteFilter = async (id) => {
    await api.delete(`/filters/${id}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Filter size={20} className="text-emerald-400" />
        <h2 className="text-xl font-bold text-white">Filter Builder</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Builder */}
        <div className="lg:col-span-2">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Build Filter</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Logic:</span>
                <div className="flex gap-1 bg-[#0f0f0f] rounded-lg p-0.5">
                  {['AND', 'OR'].map(op => (
                    <button key={op} onClick={() => setOperator(op)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${operator === op ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'}`}>
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {conditions.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">Add conditions to filter contacts</p>
              )}
              {conditions.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2">
                  {i > 0 && <span className="text-xs text-gray-600 w-8 text-center">{operator}</span>}
                  {i === 0 && <span className="text-xs text-gray-600 w-8 text-center">If</span>}
                  <select value={c.field} onChange={e => updateCondition(c.id, 'field', e.target.value)}
                    className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
                    {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <select value={c.op} onChange={e => updateCondition(c.id, 'op', e.target.value)}
                    className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
                    {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {!['is_null', 'is_not_null'].includes(c.op) && (
                    <input value={c.value} onChange={e => updateCondition(c.id, 'value', e.target.value)}
                      placeholder="value..."
                      className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" />
                  )}
                  <button onClick={() => removeCondition(c.id)} className="text-gray-600 hover:text-red-400">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={addCondition}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg">
                <Plus size={12} /> Add Condition
              </button>
              <button onClick={applyFilter} disabled={loading}
                className="flex items-center gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg disabled:opacity-50">
                <Play size={12} /> {loading ? 'Running...' : 'Apply Filter'}
              </button>
            </div>
          </div>

          {/* Save filter */}
          <div className="flex gap-2 mb-4">
            <input value={saveName} onChange={e => setSaveName(e.target.value)}
              placeholder="Save filter as..."
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
            <button onClick={saveFilter} disabled={!saveName || saving}
              className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-2">
              <Save size={14} /> Save
            </button>
          </div>

          {/* Results */}
          {results !== null && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
                <Users size={14} className="text-emerald-400" />
                <span className="text-sm font-semibold text-white">{results.length} contacts match</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      {['Name', 'Phone', 'Email', 'Status', 'Spent'].map(h => (
                        <th key={h} className="text-left text-gray-500 px-4 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(0, 20).map(c => (
                      <tr key={c.id} className="border-b border-[#2a2a2a] hover:bg-white/5">
                        <td className="px-4 py-2 text-white">{c.name || '—'}</td>
                        <td className="px-4 py-2 text-gray-400">{c.whatsapp_number}</td>
                        <td className="px-4 py-2 text-gray-400">{c.email || '—'}</td>
                        <td className="px-4 py-2"><span className="text-xs px-1.5 py-0.5 rounded bg-[#2a2a2a] text-gray-300">{c.status}</span></td>
                        <td className="px-4 py-2 text-gray-400">PKR {Number(c.total_spent_pkr || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {results.length > 20 && (
                      <tr><td colSpan={5} className="px-4 py-2 text-gray-600 text-center">... and {results.length - 20} more</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Saved filters */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Saved Filters</h3>
          {saved.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 text-center text-gray-600 text-xs">No saved filters</div>
          ) : (
            <div className="space-y-2">
              {saved.map(f => (
                <div key={f.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">{f.name}</p>
                    <p className="text-xs text-gray-500">{f.entity_type} · {(f.filter_json?.conditions || []).length} conditions</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => loadFilter(f)} className="text-gray-500 hover:text-emerald-400 p-1.5">
                      <Play size={13} />
                    </button>
                    <button onClick={() => deleteFilter(f.id)} className="text-gray-500 hover:text-red-400 p-1.5">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
