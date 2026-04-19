import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';
import DataTable from '../components/DataTable';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients]           = useState([]);
  const [modal, setModal]               = useState(false);
  const [form, setForm]                 = useState({ client_id: '', slot_datetime: '', notes: '' });

  useEffect(() => {
    api.get('/appointments').then(r => setAppointments(r.data));
    api.get('/clients').then(r => setClients(r.data));
  }, []);

  const create = async () => {
    const r = await api.post('/appointments', form);
    setAppointments(a => [r.data, ...a]);
    setModal(false);
    setForm({ client_id: '', slot_datetime: '', notes: '' });
  };

  const updateStatus = async (id, status) => {
    const r = await api.put(`/appointments/${id}`, { status });
    setAppointments(a => a.map(x => x.id === id ? { ...x, status: r.data.status } : x));
  };

  const cols = [
    { key: 'name',          label: 'Client',  render: (v, r) => v || r.whatsapp_number },
    { key: 'slot_datetime', label: 'Date/Time', render: v => format(new Date(v), 'dd MMM yyyy HH:mm') },
    { key: 'notes',         label: 'Notes' },
    { key: 'status',        label: 'Status', render: v => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        v === 'confirmed'  ? 'bg-emerald-500/20 text-emerald-400' :
        v === 'completed'  ? 'bg-blue-500/20 text-blue-400' :
        v === 'cancelled'  ? 'bg-red-500/20 text-red-400' :
        'bg-yellow-500/20 text-yellow-400'
      }`}>{v}</span>
    )},
    { key: 'id', label: 'Actions', render: (v, r) => (
      <div className="flex gap-2">
        {r.status === 'pending' && (
          <button onClick={() => updateStatus(v, 'confirmed')} className="text-xs text-emerald-400 hover:text-emerald-300">Confirm</button>
        )}
        {r.status !== 'cancelled' && r.status !== 'completed' && (
          <button onClick={() => updateStatus(v, 'cancelled')} className="text-xs text-red-400 hover:text-red-300">Cancel</button>
        )}
        {r.status === 'confirmed' && (
          <button onClick={() => updateStatus(v, 'completed')} className="text-xs text-blue-400 hover:text-blue-300">Complete</button>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Appointments</h2>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Book Appointment
        </button>
      </div>

      <DataTable columns={cols} data={appointments} />

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-white mb-4">Book Appointment</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Client</label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.whatsapp_number}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date & Time</label>
                <input type="datetime-local" value={form.slot_datetime} onChange={e => setForm(f => ({ ...f, slot_datetime: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={create} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Book</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
