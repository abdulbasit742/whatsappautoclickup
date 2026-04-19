import { useEffect, useState } from 'react';
import { Zap, Plus, Play, Pause, Trash2, ChevronRight } from 'lucide-react';
import api from '../utils/api';

const TRIGGER_TYPES  = ['new_message','no_reply','payment_pending','issue_created','campaign_completed'];
const CONDITION_KEYS = ['lead_stage','tags','sentiment','assigned_user','amount_due'];
const ACTION_TYPES   = ['create_followup','assign_user','send_template','create_issue','notify_admin'];

const EMPTY_WF = { name: '', trigger: { type: '', config: {} }, conditions: [], actions: [] };

export default function WorkflowBuilder() {
  const [workflows, setWf]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY_WF);

  const load = () => api.get('/workflows').then(r => setWf(r.data));

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const save = async () => {
    if (editing === 'new') await api.post('/workflows', form);
    else await api.put(`/workflows/${editing}`, form);
    setEditing(null);
    setForm(EMPTY_WF);
    await load();
  };

  const toggle = async (id) => {
    await api.put(`/workflows/${id}/toggle`);
    setWf(w => w.map(x => x.id === id ? { ...x, is_active: !x.is_active } : x));
  };

  const del = async (id) => {
    if (!confirm('Delete this workflow?')) return;
    await api.delete(`/workflows/${id}`);
    setWf(w => w.filter(x => x.id !== id));
  };

  const startEdit = (wf) => {
    setEditing(wf.id);
    setForm({ name: wf.name, trigger: wf.trigger, conditions: wf.conditions || [], actions: wf.actions || [] });
  };

  const addCondition = () => setForm(f => ({ ...f, conditions: [...f.conditions, { key: '', operator: 'equals', value: '' }] }));
  const addAction    = () => setForm(f => ({ ...f, actions: [...f.actions, { type: '', config: {} }] }));

  if (loading) return <div className="text-gray-400">Loading workflows...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Zap size={20} className="text-yellow-400" /> Workflow Builder</h2>
        <button onClick={() => { setEditing('new'); setForm(EMPTY_WF); }} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus size={14} /> New Workflow
        </button>
      </div>

      {/* Workflow list */}
      {!editing && (
        <div className="space-y-3">
          {workflows.map(wf => (
            <div key={wf.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{wf.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${wf.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {wf.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Trigger: <span className="text-gray-400">{wf.trigger?.type?.replace(/_/g,' ')}</span>
                    · Runs: <span className="text-gray-400">{wf.total_runs || 0}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggle(wf.id)} className={`p-1.5 rounded-lg ${wf.is_active ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}>
                    {wf.is_active ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button onClick={() => startEdit(wf)} className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 text-xs">Edit</button>
                  <button onClick={() => del(wf.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {workflows.length === 0 && <div className="text-center text-gray-500 py-12">No workflows yet. Create one to automate your CRM.</div>}
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
          <h3 className="font-semibold text-white">{editing === 'new' ? 'Create' : 'Edit'} Workflow</h3>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Workflow name" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none" />

          {/* Trigger */}
          <div>
            <p className="text-xs text-gray-400 font-medium mb-2">TRIGGER</p>
            <select value={form.trigger?.type || ''} onChange={e => setForm(f => ({ ...f, trigger: { ...f.trigger, type: e.target.value } }))}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none">
              <option value="">Select trigger...</option>
              {TRIGGER_TYPES.map(t => <option key={t} value={t} className="bg-[#111]">{t.replace(/_/g,' ')}</option>)}
            </select>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 font-medium">CONDITIONS</p>
              <button onClick={addCondition} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add</button>
            </div>
            {form.conditions.map((c, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select value={c.key} onChange={e => setForm(f => ({ ...f, conditions: f.conditions.map((x,j) => j===i ? { ...x, key: e.target.value } : x) }))}
                  className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white outline-none">
                  <option value="">Field...</option>
                  {CONDITION_KEYS.map(k => <option key={k} value={k}>{k.replace(/_/g,' ')}</option>)}
                </select>
                <input value={c.value} onChange={e => setForm(f => ({ ...f, conditions: f.conditions.map((x,j) => j===i ? { ...x, value: e.target.value } : x) }))}
                  placeholder="Value" className="w-28 bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white outline-none" />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 font-medium">ACTIONS</p>
              <button onClick={addAction} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add</button>
            </div>
            {form.actions.map((a, i) => (
              <select key={i} value={a.type} onChange={e => setForm(f => ({ ...f, actions: f.actions.map((x,j) => j===i ? { ...x, type: e.target.value } : x) }))}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white outline-none mb-2">
                <option value="">Action...</option>
                {ACTION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setEditing(null)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            <button onClick={save} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Save Workflow</button>
          </div>
        </div>
      )}
    </div>
  );
}
