import { useEffect, useState } from 'react';
import { Plus, CalendarDays, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';
import DataTable from '../components/DataTable';
import { useToast } from '../components/Toast';

const STATUS_STYLES = {
  pending:   'bg-yellow-500/20 text-yellow-400',
  confirmed: 'bg-emerald-500/20 text-emerald-400',
  cancelled: 'bg-red-500/20 text-red-400',
  completed: 'bg-gray-500/20 text-gray-400',
};

export default function Appointments() {
  const toast = useToast();
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients]           = useState([]);
  const [modal, setModal]               = useState(false);
  const [form, setForm]                 = useState({ client_id: '', slot_datetime: '', notes: '' });
  const [formErr, setFormErr]           = useState('');
  const [creating, setCreating]         = useState(false);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState('upcoming');

  useEffect(() => {
    Promise.all([
      api.get('/appointments'),
      api.get('/clients'),
    ]).then(([a, c]) => {
      setAppointments(a.data);
      setClients(c.data);
    }).catch(() => toast('Failed to load appointments', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const create = async () => {
    if (!form.client_id) { setFormErr('Please select a client'); return; }
    if (!form.slot_datetime) { setFormErr('Please select a date and time'); return; }
    setCreating(true);
    try {
      const r = await api.post('/appointments', form);
      setAppointments(a => [r.data, ...a]);
      setModal(false);
      setForm({ client_id: '', slot_datetime: '', notes: '' });
      toast('Appointment booked!', 'success');
    } catch (err) {
      setFormErr(err.response?.data?.error || 'Failed to book appointment');
      toast('Failed to book appointment', 'error');
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const r = await api.put(`/appointments/${id}`, { status });
      setAppointments(a => a.map(x => x.id === id ? { ...x, status: r.data.status } : x));
      toast(`Appointment ${status}`, 'success');
    } catch {
      toast('Failed to update appointment', 'error');
    }
  };

  const upcoming = appointments.filter(a => a.status === 'confirmed' || a.status === 'pending');

  const cols = [
    { key: 'name',          label: 'Client',   render: (v, r) => v || r.whatsapp_number },
    { key: 'slot_datetime', label: 'Date/Time', render: v => format(new Date(v), 'dd MMM yyyy HH:mm') },
    { key: 'status', label: 'Status', render: v => (
      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[v] || 'text-gray-400'}`}>{v}</span>
    )},
    { key: 'reminder_sent', label: 'Reminder', render: v => (
      <span className={`text-xs ${v ? 'text-emerald-400' : 'text-gray-500'}`}>{v ? '✅ Sent' : '⏳ Pending'}</span>
    )},
    { key: 'notes', label: 'Notes', render: v => v || '—' },
    { key: 'id', label: 'Actions', render: (v, r) => (
      <div className="flex gap-2">
        {(r.status === 'pending' || r.status === 'confirmed') && (
          <button onClick={() => updateStatus(v, 'completed')} className="text-xs text-blue-400 hover:text-blue-300">Complete</button>
        )}
        {(r.status === 'pending' || r.status === 'confirmed') && (
          <button onClick={() => updateStatus(v, 'cancelled')} className="text-xs text-red-400 hover:text-red-300">Cancel</button>
        )}
      </div>
    )},
  ];

  const minDateTime = new Date().toISOString().slice(0, 16);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <CalendarDays size={20} className="text-emerald-400" /> Appointments
        </h2>
        <button onClick={() => { setFormErr(''); setModal(true); }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Book Appointment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1 mb-6 w-fit">
        {[{ id: 'upcoming', label: 'Upcoming' }, { id: 'all', label: 'All Appointments' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t.label} {t.id === 'upcoming' && upcoming.length > 0 && <span className="ml-1 bg-white/20 rounded-full px-1.5 text-xs">{upcoming.length}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'upcoming' ? (
        upcoming.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-12 text-center text-gray-500">
            🎉 No upcoming appointments!
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.map(a => (
              <div key={a.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-semibold text-white">{a.name || a.whatsapp_number}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.whatsapp_number}</p>
                    <p className="text-sm text-emerald-400 mt-1">
                      {format(new Date(a.slot_datetime), "EEEE, d MMMM yyyy 'at' h:mm a")}
                    </p>
                    {a.notes && <p className="text-xs text-gray-400 mt-1">{a.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                    <span className={`text-xs ${a.reminder_sent ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {a.reminder_sent ? '✅ Reminder Sent' : '⏳ Reminder Pending'}
                    </span>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => updateStatus(a.id, 'completed')}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-400/30 px-2 py-1 rounded-lg transition-colors">
                        <CheckCircle2 size={12} /> Complete
                      </button>
                      <button onClick={() => updateStatus(a.id, 'cancelled')}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-400/30 px-2 py-1 rounded-lg transition-colors">
                        <XCircle size={12} /> Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        appointments.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-12 text-center text-gray-500">
            No appointments yet.
          </div>
        ) : (
          <DataTable columns={cols} data={appointments} />
        )
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-white mb-5">Book Appointment</h3>

            {formErr && (
              <div className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {formErr}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Client *</label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.whatsapp_number}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date & Time *</label>
                <input type="datetime-local" min={minDateTime} value={form.slot_datetime}
                  onChange={e => setForm(f => ({ ...f, slot_datetime: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Optional notes…"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="flex-1 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 py-2 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={create} disabled={creating}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                {creating && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Book
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

