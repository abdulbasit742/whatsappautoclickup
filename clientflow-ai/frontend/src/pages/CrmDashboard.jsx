import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Flame, Users, TrendingUp, Tag, X } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';
import StatCard from '../components/StatCard';

const MOCK_CLIENTS = [
  { id: 1,  name: 'Sara Ahmed',   whatsapp_number: '+923001234567', status: 'lead',     total_spent_pkr: 0,       lead_score: 91, last_active_at: new Date(), tags: ['Hot Lead', 'WhatsApp'], source: 'WhatsApp', agent: 'Abdul Basit' },
  { id: 2,  name: 'Ali Hassan',   whatsapp_number: '+923009876543', status: 'active',   total_spent_pkr: 25000,   lead_score: 74, last_active_at: new Date(), tags: ['Warm', 'Referral'],    source: 'Referral',  agent: 'Zara Khan' },
  { id: 3,  name: 'Mia Khan',     whatsapp_number: '+923451234567', status: 'paid',     total_spent_pkr: 85000,   lead_score: 58, last_active_at: new Date(), tags: ['VIP', 'Repeat'],       source: 'Website',   agent: 'Hassan Ali' },
  { id: 4,  name: 'Omar Sheikh',  whatsapp_number: '+923331234567', status: 'inactive', total_spent_pkr: 5000,    lead_score: 22, last_active_at: new Date(), tags: ['Cold'],                source: 'WhatsApp',  agent: 'Abdul Basit' },
  { id: 5,  name: 'Fatima Malik', whatsapp_number: '+923211234567', status: 'lead',     total_spent_pkr: 0,       lead_score: 85, last_active_at: new Date(), tags: ['Hot Lead', 'Web'],     source: 'Website',   agent: 'Zara Khan' },
];

const SCORE_COLOR = s => s >= 80 ? 'bg-emerald-400' : s >= 50 ? 'bg-yellow-400' : 'bg-red-400';

const STATUS_BADGE = {
  lead:     'bg-yellow-500/20 text-yellow-400',
  active:   'bg-blue-500/20 text-blue-400',
  paid:     'bg-emerald-500/20 text-emerald-400',
  inactive: 'bg-gray-500/20 text-gray-400',
};

const TEMP = {
  lead:     { label: 'Hot',  color: 'text-red-400' },
  active:   { label: 'Warm', color: 'text-yellow-400' },
  paid:     { label: 'Warm', color: 'text-yellow-400' },
  inactive: { label: 'Cold', color: 'text-blue-400' },
};

export default function CrmDashboard() {
  const navigate = useNavigate();
  const [clients,  setClients]  = useState(MOCK_CLIENTS);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [note,     setNote]     = useState('');

  useEffect(() => {
    api.get('/clients').then(r => {
      if (r.data?.length) setClients(r.data.map((c, i) => ({
        ...MOCK_CLIENTS[i % MOCK_CLIENTS.length], ...c,
        lead_score: MOCK_CLIENTS[i % MOCK_CLIENTS.length].lead_score,
        tags: MOCK_CLIENTS[i % MOCK_CLIENTS.length].tags,
        source: MOCK_CLIENTS[i % MOCK_CLIENTS.length].source,
        agent: MOCK_CLIENTS[i % MOCK_CLIENTS.length].agent,
      })));
    }).catch(() => {});
  }, []);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || c.whatsapp_number.includes(q);
  });

  const counts = {
    total: clients.length,
    hot:   clients.filter(c => c.status === 'lead' || c.lead_score >= 80).length,
    warm:  clients.filter(c => (c.status === 'active' || c.status === 'paid') && c.lead_score < 80).length,
    cold:  clients.filter(c => c.status === 'inactive').length,
  };

  const temp = selected ? (TEMP[selected.status] || TEMP.inactive) : null;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Leads"  value={counts.total} icon={Users}      color="emerald" />
        <StatCard title="Hot Leads"    value={counts.hot}   icon={Flame}      color="red"     />
        <StatCard title="Warm Leads"   value={counts.warm}  icon={TrendingUp} color="yellow"  />
        <StatCard title="Cold Leads"   value={counts.cold}  icon={Users}      color="blue"    />
      </div>

      {/* Main area */}
      <div className="flex gap-4" style={{ minHeight: 480 }}>
        {/* Client List */}
        <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-4 border-b border-[#2a2a2a]">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search clients…"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg pl-8 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead className="sticky top-0 bg-[#1a1a1a]">
                <tr className="border-b border-[#2a2a2a]">
                  {['Name', 'Phone', 'Lead Score', 'Status', 'Last Active', 'Follow-up', 'Agent', 'Tags'].map(h => (
                    <th key={h} className="text-left text-gray-500 py-3 px-4 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => { setSelected(c); setNote(''); }}
                    className={`border-b border-[#2a2a2a]/50 cursor-pointer hover:bg-white/[0.03] transition-colors ${
                      selected?.id === c.id ? 'bg-emerald-500/5 border-l-2 border-l-emerald-400' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                          {(c.name || c.whatsapp_number)[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-white truncate max-w-[120px]">{c.name || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-400">{c.whatsapp_number}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${SCORE_COLOR(c.lead_score || 50)}`} style={{ width: `${c.lead_score || 50}%` }} />
                        </div>
                        <span className="text-white font-medium">{c.lead_score || 50}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status] || STATUS_BADGE.inactive}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {c.last_active_at ? format(new Date(c.last_active_at), 'dd MMM HH:mm') : '—'}
                    </td>
                    <td className="py-3 px-4 text-yellow-400 text-[10px]">Tomorrow</td>
                    <td className="py-3 px-4 text-gray-400">{c.agent || 'Abdul Basit'}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1 flex-wrap">
                        {(c.tags || []).slice(0, 2).map(tag => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-[#2a2a2a] text-gray-400 rounded-full flex items-center gap-0.5">
                            <Tag size={7} /> {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Client Intelligence Panel */}
        {selected && (
          <div className="w-80 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex flex-col shrink-0 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Client Profile</h3>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Avatar */}
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center text-xl font-bold text-emerald-400 mx-auto mb-2">
                  {(selected.name || selected.whatsapp_number)[0].toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-white">{selected.name || '—'}</p>
                <p className="text-xs text-gray-500">{selected.whatsapp_number}</p>
                <span className={`text-xs font-semibold ${temp?.color}`}>{temp?.label} Lead</span>
              </div>

              {/* Details */}
              <InfoSection title="Lead Info">
                <InfoRow label="Source"       value={selected.source || 'WhatsApp'} />
                <InfoRow label="Status"       value={
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[selected.status] || STATUS_BADGE.inactive}`}>
                    {selected.status}
                  </span>
                } />
                <InfoRow label="Lead Score"   value={
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${SCORE_COLOR(selected.lead_score || 50)}`} style={{ width: `${selected.lead_score || 50}%` }} />
                    </div>
                    <span className="text-xs text-white font-medium">{selected.lead_score || 50}</span>
                  </div>
                } />
              </InfoSection>

              <InfoSection title="Behaviour">
                <InfoRow label="Sentiment"     value={<span className="text-xs text-emerald-400">Positive</span>} />
                <InfoRow label="Buyer Intent"  value={<span className="text-xs text-yellow-400">High</span>} />
                <InfoRow label="Issue Risk"    value={<span className="text-xs text-emerald-400">Low</span>} />
              </InfoSection>

              <InfoSection title="Financial">
                <InfoRow label="Total Spent"   value={<span className="text-xs text-white">PKR {Number(selected.total_spent_pkr || 0).toLocaleString()}</span>} />
                <InfoRow label="Payment"       value={
                  <span className={`text-xs font-medium ${selected.status === 'paid' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                    {selected.status === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                } />
              </InfoSection>

              <InfoSection title="CRM">
                <InfoRow label="Agent"         value={<span className="text-xs text-white">{selected.agent || 'Abdul Basit'}</span>} />
                <InfoRow label="Follow-up Due" value={<span className="text-xs text-yellow-400">Tomorrow 2 PM</span>} />
              </InfoSection>

              {/* Tags */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {(selected.tags || []).map(t => (
                    <span key={t} className="flex items-center gap-1 text-[10px] bg-[#2a2a2a] text-gray-400 px-2 py-0.5 rounded-full">
                      <Tag size={8} /> {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Notes</p>
                <textarea
                  value={note} onChange={e => setNote(e.target.value)} rows={3}
                  placeholder="Add a note…"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2.5 py-2 text-[11px] text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/clients/${selected.id}`)}
                  className="flex-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-2 rounded-lg border border-emerald-500/20 transition-colors"
                >
                  Full Profile
                </button>
                <button
                  onClick={() => navigate('/chats')}
                  className="flex-1 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 py-2 rounded-lg border border-blue-500/20 transition-colors"
                >
                  Open Chat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 text-right">{typeof value === 'string' ? <span className="text-xs text-gray-300">{value}</span> : value}</div>
    </div>
  );
}
