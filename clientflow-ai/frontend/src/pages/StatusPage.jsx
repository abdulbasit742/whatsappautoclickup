import { useEffect, useState } from 'react';
import { Plus, Settings, AlertTriangle, Wrench, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';

const STATUS_STYLES = {
  operational:    { label: '● Operational',    cls: 'bg-emerald-500/20 text-emerald-400' },
  degraded:       { label: '● Degraded',        cls: 'bg-yellow-500/20 text-yellow-400' },
  partial_outage: { label: '● Partial Outage',  cls: 'bg-orange-500/20 text-orange-400' },
  major_outage:   { label: '● Major Outage',    cls: 'bg-red-500/20 text-red-400' },
  maintenance:    { label: '● Maintenance',     cls: 'bg-blue-500/20 text-blue-400' },
};

const OVERALL_LABELS = {
  operational:    { label: 'All Systems Operational', cls: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  degraded:       { label: 'Degraded Performance',    cls: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/20' },
  partial_outage: { label: 'Partial System Outage',   cls: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
  major_outage:   { label: 'Major System Outage',     cls: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
};

export default function StatusPage() {
  const [data, setData]           = useState(null);
  const [components, setComponents] = useState([]);
  const [modal, setModal]         = useState(null);
  const [maintModal, setMaintModal] = useState(false);
  const [maintForm, setMaintForm] = useState({ title: '', description: '', scheduled_start: '', scheduled_end: '', affected_components: '' });
  const [loading, setLoading]     = useState(true);

  const load = () => Promise.all([
    api.get('/status/public').then(r => setData(r.data)),
    api.get('/status/components').then(r => setComponents(r.data)),
  ]);

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const updateComponent = async (id, status, message) => {
    await api.put(`/status/components/${id}`, { status, message });
    await load();
    setModal(null);
  };

  const scheduleMaint = async () => {
    if (!maintForm.title.trim()) return alert('Title required');
    await api.post('/status/maintenance', maintForm);
    await load();
    setMaintModal(false);
    setMaintForm({ title: '', description: '', scheduled_start: '', scheduled_end: '', affected_components: '' });
  };

  if (loading) return <div className="text-gray-400">Loading status page...</div>;

  const overall = data?.overall || 'operational';
  const overallInfo = OVERALL_LABELS[overall] || OVERALL_LABELS.operational;

  const grouped = {};
  (data?.components || []).forEach(c => {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Status Page</h2>
        <button onClick={() => setMaintModal(true)} className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-lg text-sm">
          <Wrench size={14} /> Schedule Maintenance
        </button>
      </div>

      {/* Overall status banner */}
      <div className={`border rounded-xl p-5 mb-6 flex items-center gap-3 ${overallInfo.bg}`}>
        {overall === 'operational' ? <CheckCircle size={22} className="text-emerald-400 shrink-0" /> : <AlertTriangle size={22} className="text-orange-400 shrink-0" />}
        <p className={`text-lg font-semibold ${overallInfo.cls}`}>{overallInfo.label}</p>
      </div>

      {/* Components by category */}
      {Object.entries(grouped).map(([category, comps]) => (
        <div key={category} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-4">
          <h3 className="text-sm font-semibold text-white mb-3 capitalize">{category || 'Services'}</h3>
          <div className="divide-y divide-[#1f1f1f]">
            {comps.map(comp => {
              const s = STATUS_STYLES[comp.status] || STATUS_STYLES.operational;
              const admin = components.find(c => c.name === comp.name);
              return (
                <div key={comp.name} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">{comp.name}</p>
                    {comp.message && <p className="text-xs text-gray-500 mt-0.5">{comp.message}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                    {admin && (
                      <button onClick={() => setModal(admin)} className="text-xs text-gray-500 hover:text-gray-300 border border-[#2a2a2a] px-2 py-1 rounded-lg">
                        <Settings size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Active incidents */}
      {data?.incidents?.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-400" /> Active Incidents
          </h3>
          <div className="space-y-2">
            {data.incidents.map(i => (
              <div key={i.id} className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm text-white font-medium">{i.title}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">{i.severity}</span>
                </div>
                <p className="text-xs text-gray-500">{format(new Date(i.created_at), 'dd MMM yyyy HH:mm')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming maintenance */}
      {data?.maintenance?.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Wrench size={14} className="text-blue-400" /> Upcoming Maintenance
          </h3>
          <div className="space-y-2">
            {data.maintenance.map((m, i) => (
              <div key={i} className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                <p className="text-sm text-white font-medium">{m.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>
                <p className="text-xs text-blue-400 mt-1">
                  {format(new Date(m.scheduled_start), 'dd MMM HH:mm')} – {format(new Date(m.scheduled_end), 'dd MMM HH:mm')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Update component modal */}
      {modal && (
        <ComponentUpdateModal component={modal} onClose={() => setModal(null)} onSave={updateComponent} />
      )}

      {/* Schedule maintenance modal */}
      {maintModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Schedule Maintenance</h3>
              <button onClick={() => setMaintModal(false)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <div className="space-y-3">
              {[['title','Title','System Upgrade'],['description','Description','We will be upgrading...'],['affected_components','Affected Components','API, Database']].map(([k,l,ph]) => (
                <div key={k}>
                  <label className="block text-xs text-gray-400 mb-1">{l}</label>
                  <input value={maintForm[k]} onChange={e => setMaintForm(f => ({ ...f, [k]: e.target.value }))}
                    placeholder={ph}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"/>
                </div>
              ))}
              {[['scheduled_start','Start Time'],['scheduled_end','End Time']].map(([k,l]) => (
                <div key={k}>
                  <label className="block text-xs text-gray-400 mb-1">{l}</label>
                  <input type="datetime-local" value={maintForm[k]} onChange={e => setMaintForm(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"/>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setMaintModal(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={scheduleMaint} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ComponentUpdateModal({ component, onClose, onSave }) {
  const [status, setStatus]   = useState(component.status);
  const [message, setMessage] = useState(component.message || '');
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white">Update: {component.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18}/></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
              <option value="operational">Operational</option>
              <option value="degraded">Degraded</option>
              <option value="partial_outage">Partial Outage</option>
              <option value="major_outage">Major Outage</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Status Message (optional)</label>
            <input value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Brief description..."
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"/>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
          <button onClick={() => onSave(component.id, status, message)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Update</button>
        </div>
      </div>
    </div>
  );
}
