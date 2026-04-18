import { useEffect, useState } from 'react';
import { Search, Download, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import DataTable from '../components/DataTable';
import { useToast } from '../components/Toast';

const STATUS_COLORS = {
  lead:     'bg-yellow-500/20 text-yellow-400',
  active:   'bg-blue-500/20 text-blue-400',
  paid:     'bg-emerald-500/20 text-emerald-400',
  inactive: 'bg-gray-500/20 text-gray-400',
  blocked:  'bg-red-500/20 text-red-400',
};

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();
  const toast = useToast();

  const load = () => api.get('/clients').then(r => setClients(r.data));

  useEffect(() => { load(); }, []);

  const blockClient = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Block this client? They will no longer receive auto-replies.')) return;
    try {
      await api.delete(`/clients/${id}`);
      toast('Client blocked.', 'warning');
      load();
    } catch (err) {
      toast('Failed: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const filtered = clients.filter(c => {
    const matchSearch = (c.name || '').toLowerCase().includes(search.toLowerCase()) || c.whatsapp_number.includes(search);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const cols = [
    { key: 'name',            label: 'Name',        render: (v, r) => v || r.whatsapp_number },
    { key: 'whatsapp_number', label: 'WhatsApp' },
    { key: 'status',          label: 'Status',      render: v => <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[v]}`}>{v}</span> },
    { key: 'total_spent_pkr', label: 'Spent',       render: v => `PKR ${Number(v).toLocaleString()}` },
    { key: 'last_active_at',  label: 'Last Active', render: v => format(new Date(v), 'dd MMM HH:mm') },
    { key: 'id',              label: '',            render: (v, r) => r.status !== 'blocked' ? (
      <button onClick={e => blockClient(v, e)} title="Block client" className="text-gray-600 hover:text-red-400 transition-colors p-1">
        <Ban size={14}/>
      </button>
    ) : null },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">
          Clients <span className="text-gray-500 text-base">({filtered.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <a
            href="/api/clients/export/csv"
            className="flex items-center gap-1.5 text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-2 rounded-lg text-sm transition-colors"
            title="Export CSV"
          >
            <Download size={14}/> Export
          </a>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'lead', 'active', 'paid', 'inactive', 'blocked'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-lg text-xs capitalize transition-colors ${statusFilter === s ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'}`}>
            {s} ({s === 'all' ? clients.length : clients.filter(c => c.status === s).length})
          </button>
        ))}
      </div>

      <DataTable columns={cols} data={filtered} onRowClick={r => navigate(`/clients/${r.id}`)} />
    </div>
  );
}
