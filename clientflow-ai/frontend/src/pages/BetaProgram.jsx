import { useEffect, useState } from 'react';
import { Plus, X, Users, ToggleLeft, ToggleRight, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';

const emptyForm = { name: '', description: '', feature_flag: '' };

export default function BetaProgram() {
  const [programs, setPrograms] = useState([]);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [selected, setSelected] = useState(null);
  const [enrolled, setEnrolled] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [clients, setClients]   = useState([]);
  const [enrollClient, setEnrollClient] = useState('');
  const [tab, setTab]           = useState('enrolled');
  const [loading, setLoading]   = useState(true);

  const load = () => api.get('/beta').then(r => setPrograms(r.data));

  useEffect(() => {
    Promise.all([load(), api.get('/clients').then(r => setClients(r.data))]).finally(() => setLoading(false));
  }, []);

  const create = async () => {
    if (!form.name.trim()) return alert('Name required');
    try {
      const r = await api.post('/beta', form);
      setPrograms(p => [r.data, ...p]);
      setForm(emptyForm); setModal(false);
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const toggle = async (id) => {
    const r = await api.put(`/beta/${id}/toggle`);
    setPrograms(p => p.map(x => x.id === id ? r.data : x));
  };

  const viewProgram = async (id) => {
    setSelected(id); setTab('enrolled');
    const [e, f] = await Promise.all([api.get(`/beta/${id}/enrolled`), api.get(`/beta/${id}/feedback`)]);
    setEnrolled(e.data); setFeedback(f.data);
  };

  const enroll = async () => {
    if (!enrollClient) return alert('Select a client');
    await api.post(`/beta/${selected}/enroll`, { client_id: enrollClient });
    const r = await api.get(`/beta/${selected}/enrolled`);
    setEnrolled(r.data);
    setEnrollClient('');
  };

  const unenroll = async (clientId) => {
    await api.delete(`/beta/${selected}/enroll/${clientId}`);
    setEnrolled(e => e.filter(x => x.client_id !== clientId));
  };

  const prog = programs.find(p => p.id === selected);
  if (loading) return <div className="text-gray-400">Loading beta programs...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Beta Program</h2>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> New Beta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {programs.length === 0 && (
          <div className="col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500">No beta programs yet.</div>
        )}
        {programs.map(p => (
          <div key={p.id} className={`bg-[#1a1a1a] border rounded-xl p-5 cursor-pointer transition-colors ${selected === p.id ? 'border-emerald-500/50' : 'border-[#2a2a2a]'}`}
            onClick={() => viewProgram(p.id)}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-white">{p.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); toggle(p.id); }} className={`shrink-0 ml-2 ${p.is_active ? 'text-emerald-400' : 'text-gray-500'}`}>
                {p.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
              </button>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Users size={11} /> {p.enrolled_count} enrolled</span>
              {p.feature_flag && <span className="font-mono bg-[#0f0f0f] px-2 py-0.5 rounded text-emerald-400">{p.feature_flag}</span>}
              <span className={`px-2 py-0.5 rounded-full ${p.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                {p.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {selected && prog && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">{prog.name} — Details</h3>
          <div className="flex gap-2 mb-4">
            {['enrolled', 'feedback'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`text-xs px-3 py-1.5 rounded-lg capitalize ${tab === t ? 'bg-emerald-500 text-white' : 'bg-[#0f0f0f] border border-[#2a2a2a] text-gray-400'}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'enrolled' && (
            <>
              <div className="flex gap-2 mb-4">
                <select value={enrollClient} onChange={e => setEnrollClient(e.target.value)}
                  className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                  <option value="">Enroll a client...</option>
                  {clients.filter(c => !enrolled.find(e => e.client_id === c.id)).map(c => (
                    <option key={c.id} value={c.id}>{c.name || c.whatsapp_number}</option>
                  ))}
                </select>
                <button onClick={enroll} className="text-sm bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg">Enroll</button>
              </div>
              <div className="space-y-2">
                {enrolled.length === 0 && <p className="text-gray-500 text-sm">No enrolled clients.</p>}
                {enrolled.map(e => (
                  <div key={e.id} className="flex items-center justify-between bg-[#0f0f0f] rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm text-white">{e.name || e.whatsapp_number}</p>
                      <p className="text-xs text-gray-500">{format(new Date(e.enrolled_at), 'dd MMM yyyy')}</p>
                    </div>
                    <button onClick={() => unenroll(e.client_id)} className="text-xs text-red-400 hover:text-red-300 border border-red-400/20 px-2 py-1 rounded-lg">Remove</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'feedback' && (
            <div className="space-y-2">
              {feedback.length === 0 && <p className="text-gray-500 text-sm">No feedback yet.</p>}
              {feedback.map(f => (
                <div key={f.id} className="bg-[#0f0f0f] rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-white">{f.client_name}</p>
                    {f.rating && <span className="text-yellow-400 text-xs">{'⭐'.repeat(f.rating)}</span>}
                  </div>
                  {f.comment && <p className="text-xs text-gray-400">"{f.comment}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">New Beta Program</h3>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <div className="space-y-3">
              {[['name','Name','AI Assistant Beta'],['description','Description','Test our new AI features'],['feature_flag','Feature Flag (optional)','ai_assistant_v2']].map(([k,l,ph]) => (
                <div key={k}>
                  <label className="block text-xs text-gray-400 mb-1">{l}</label>
                  <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    placeholder={ph}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"/>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={create} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
