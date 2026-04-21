import { useEffect, useState } from 'react';
import { Plus, FileText, Edit, Trash2, X, Link } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';

const emptyForm = {
  incident_id: '',
  summary: '',
  impact: '',
  root_cause: '',
  timeline: '',
  fixes: '',
  prevention_actions: '',
};

const SECTIONS = [
  { key: 'summary',            label: 'Summary',            placeholder: 'Brief description of the incident...' },
  { key: 'impact',             label: 'Impact',             placeholder: 'What was affected? How many users?' },
  { key: 'root_cause',         label: 'Root Cause',         placeholder: 'What caused the incident?' },
  { key: 'timeline',           label: 'Timeline',           placeholder: 'Step-by-step timeline of events...' },
  { key: 'fixes',              label: 'Fixes Applied',      placeholder: 'What was done to resolve it?' },
  { key: 'prevention_actions', label: 'Prevention Actions', placeholder: 'How will we prevent recurrence?' },
];

export default function Postmortems() {
  const [items, setItems]       = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [editing, setEditing]   = useState(null);
  const [viewing, setViewing]   = useState(null);
  const [loading, setLoading]   = useState(true);

  const load = () => api.get('/postmortems').then(r => setItems(r.data));

  useEffect(() => {
    Promise.all([load(), api.get('/incidents').then(r => setIncidents(r.data))]).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!form.summary.trim()) return alert('Summary required');
    try {
      if (editing) {
        const r = await api.put(`/postmortems/${editing}`, form);
        setItems(i => i.map(x => x.id === editing ? r.data : x));
      } else {
        const r = await api.post('/postmortems', form);
        setItems(i => [r.data, ...i]);
      }
      setModal(false); setForm(emptyForm); setEditing(null);
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const del = async (id) => {
    if (!confirm('Delete this postmortem?')) return;
    await api.delete(`/postmortems/${id}`);
    setItems(i => i.filter(x => x.id !== id));
  };

  const startEdit = (item) => {
    setForm({
      incident_id: item.incident_id || '',
      summary: item.summary || '',
      impact: item.impact || '',
      root_cause: item.root_cause || '',
      timeline: item.timeline || '',
      fixes: item.fixes || '',
      prevention_actions: item.prevention_actions || '',
    });
    setEditing(item.id); setModal(true);
  };

  if (loading) return <div className="text-gray-400">Loading postmortems...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Postmortem Documentation</h2>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setModal(true); }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> New Postmortem
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500">
            <FileText size={28} className="mx-auto mb-2 text-gray-600" />
            No postmortems yet.
          </div>
        )}
        {items.map(item => (
          <div key={item.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{item.summary?.slice(0, 80) || 'Untitled postmortem'}</h3>
                </div>
                {item.incident_title && (
                  <p className="text-xs text-blue-400 flex items-center gap-1 mb-2">
                    <Link size={10} /> Linked: {item.incident_title}
                  </p>
                )}
                {item.root_cause && <p className="text-xs text-gray-400 line-clamp-2 mb-2">Root cause: {item.root_cause}</p>}
                <p className="text-xs text-gray-500">{format(new Date(item.created_at), 'dd MMM yyyy')}</p>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button onClick={() => setViewing(item)} className="text-xs text-gray-400 hover:text-white border border-[#2a2a2a] px-2 py-1 rounded-lg flex items-center gap-1">
                  <FileText size={11} /> View
                </button>
                <button onClick={() => startEdit(item)} className="text-xs text-blue-400 hover:text-blue-300 border border-blue-400/20 px-2 py-1 rounded-lg flex items-center gap-1">
                  <Edit size={11} /> Edit
                </button>
                <button onClick={() => del(item.id)} className="text-xs text-red-400 hover:text-red-300 border border-red-400/20 px-2 py-1 rounded-lg">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit/Create Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">{editing ? 'Edit' : 'New'} Postmortem</h3>
              <button onClick={() => { setModal(false); setEditing(null); }} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>

            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">Link to Incident (optional)</label>
              <select value={form.incident_id} onChange={e => setForm(f => ({ ...f, incident_id: e.target.value }))}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                <option value="">No linked incident</option>
                {incidents.map(i => <option key={i.id} value={i.id}>{i.title} ({i.severity})</option>)}
              </select>
            </div>

            <div className="space-y-3">
              {SECTIONS.map(s => (
                <div key={s.key}>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 uppercase">{s.label}</label>
                  <textarea value={form[s.key]} onChange={e => setForm(f => ({ ...f, [s.key]: e.target.value }))}
                    placeholder={s.placeholder} rows={3}
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
              <h3 className="font-semibold text-white">Postmortem</h3>
              <button onClick={() => setViewing(null)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            {viewing.incident_title && (
              <p className="text-xs text-blue-400 flex items-center gap-1 mb-4">
                <Link size={10} /> Incident: {viewing.incident_title}
                {viewing.severity && <span className="ml-1 px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">{viewing.severity}</span>}
              </p>
            )}
            {SECTIONS.map(s => viewing[s.key] && (
              <div key={s.key} className="mb-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">{s.label}</h4>
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{viewing[s.key]}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
