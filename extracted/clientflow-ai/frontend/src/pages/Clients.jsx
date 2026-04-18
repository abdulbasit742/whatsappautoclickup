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

const LEAD_SCORE_COLORS = {
  hot:  'bg-red-500/20 text-red-400',
  warm: 'bg-orange-500/20 text-orange-400',
  cold: 'bg-blue-500/20 text-blue-400',
};

const LEAD_SCORE_LABELS = {
  hot: '🔥 Hot',
  warm: '🌤 Warm',
  cold: '❄️ Cold',
};

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [leadFilter, setLeadFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data));
  }, []);

  const filtered = clients.filter(c => {
    const matchSearch = (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      c.whatsapp_number.includes(search);
    const matchLead = leadFilter ? c.lead_score === leadFilter : true;
    return matchSearch && matchLead;
  });

  const cols = [
    { key: 'name',            label: 'Name',        render: (v, r) => v || r.whatsapp_number },
    { key: 'whatsapp_number', label: 'WhatsApp' },
    { key: 'status',          label: 'Status',      render: v => <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[v]}`}>{v}</span> },
    { key: 'lead_score',      label: 'Lead Score',  render: v => v ? <span className={`text-xs px-2 py-0.5 rounded-full ${LEAD_SCORE_COLORS[v] || ''}`}>{LEAD_SCORE_LABELS[v] || v}</span> : '—' },
    { key: 'tags',            label: 'Tags',        render: v => v && v.length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {v.slice(0, 3).map(tag => <span key={tag} className="text-xs bg-[#2a2a2a] text-gray-300 px-1.5 py-0.5 rounded">{tag}</span>)}
        {v.length > 3 && <span className="text-xs text-gray-500">+{v.length - 3}</span>}
      </div>
    ) : '—' },
    { key: 'total_spent_pkr', label: 'Spent',       render: v => `PKR ${Number(v).toLocaleString()}` },
    { key: 'last_active_at',  label: 'Last Active', render: v => v ? format(new Date(v), 'dd MMM HH:mm') : '—' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">
          Clients <span className="text-gray-500 text-base">({filtered.length})</span>
        </h2>
        <div className="flex items-center gap-3">
          {/* Lead score filter */}
          <div className="flex gap-1">
            {['', 'hot', 'warm', 'cold'].map(s => (
              <button
                key={s}
                onClick={() => setLeadFilter(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${leadFilter === s ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]'}`}
              >
                {s === '' ? 'All' : LEAD_SCORE_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>
      <DataTable columns={cols} data={filtered} onRowClick={r => navigate(`/clients/${r.id}`)} />
    </div>
  );
}
