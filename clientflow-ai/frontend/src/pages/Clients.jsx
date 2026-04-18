import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import DataTable from '../components/DataTable';

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
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/clients')
      .then(r => setClients(r.data))
      .catch(e => setError('Failed to load clients: ' + (e.response?.data?.error || e.message)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    c.whatsapp_number.includes(search)
  );

  const cols = [
    { key: 'name',            label: 'Name',        render: (v, r) => v || r.whatsapp_number },
    { key: 'whatsapp_number', label: 'WhatsApp' },
    { key: 'status',          label: 'Status',      render: v => <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[v]}`}>{v}</span> },
    { key: 'total_spent_pkr', label: 'Spent',       render: v => `PKR ${Number(v).toLocaleString()}` },
    { key: 'last_active_at',  label: 'Last Active', render: v => format(new Date(v), 'dd MMM HH:mm') },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-gray-400">
      <div className="text-center">
        <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading clients...
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">
          Clients <span className="text-gray-500 text-base">({filtered.length})</span>
        </h2>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <DataTable columns={cols} data={filtered} onRowClick={r => navigate(`/clients/${r.id}`)} />
    </div>
  );
}
