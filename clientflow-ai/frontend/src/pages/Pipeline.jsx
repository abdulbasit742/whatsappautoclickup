import { useEffect, useState } from 'react';
import { Plus, X, GripVertical, TrendingUp, RefreshCw } from 'lucide-react';
import api from '../utils/api';

const STAGE_COLORS = {
  new_lead:    { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  text: 'text-yellow-400',  dot: 'bg-yellow-400' },
  contacted:   { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400',    dot: 'bg-blue-400' },
  interested:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400',  dot: 'bg-purple-400' },
  negotiation: { bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  text: 'text-orange-400',  dot: 'bg-orange-400' },
  won:         { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  lost:        { bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400',     dot: 'bg-red-400' },
};

export default function Pipeline() {
  const [stages, setStages]   = useState([]);
  const [deals, setDeals]     = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(false);
  const [adding, setAdding]   = useState(false);
  const [clients, setClients] = useState([]);
  const [team, setTeam]       = useState([]);
  const [dragDeal, setDragDeal] = useState(null);
  const [form, setForm]       = useState({ client_id: '', stage_slug: 'new_lead', title: '', value_pkr: '', assigned_to: '', notes: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [s, d, a, c, t] = await Promise.all([
        api.get('/pipeline/stages'),
        api.get('/pipeline/deals'),
        api.get('/pipeline/analytics'),
        api.get('/clients'),
        api.get('/team'),
      ]);
      setStages(s.data);
      setDeals(d.data);
      setAnalytics(a.data);
      setClients(c.data);
      setTeam(t.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createDeal = async () => {
    if (!form.title) return;
    await api.post('/pipeline/deals', { ...form, value_pkr: Number(form.value_pkr) || 0 });
    setAdding(false);
    setForm({ client_id: '', stage_slug: 'new_lead', title: '', value_pkr: '', assigned_to: '', notes: '' });
    load();
  };

  const moveStage = async (dealId, slug) => {
    await api.patch(`/pipeline/deals/${dealId}/stage`, { stage_slug: slug });
    load();
  };

  const handleDrop = (e, slug) => {
    e.preventDefault();
    if (dragDeal) { moveStage(dragDeal, slug); setDragDeal(null); }
  };

  const stageDeals = (slug) => deals.filter(d => d.stage_slug === slug);
  const stageValue = (slug) => stageDeals(slug).reduce((s, d) => s + Number(d.value_pkr || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Sales Pipeline</h2>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg text-sm">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setAdding(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
            <Plus size={14} /> Add Deal
          </button>
        </div>
      </div>

      {/* Analytics bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Deals',     value: analytics.total_deals || 0 },
          { label: 'Pipeline Value',  value: `PKR ${Number(analytics.pipeline_value || 0).toLocaleString()}` },
          { label: 'Won',             value: analytics.won_count || 0 },
          { label: 'Conversion',      value: `${analytics.conversion_rate || '0.0'}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
            <div className="text-lg font-bold text-white">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => {
          const sc = STAGE_COLORS[stage.slug] || STAGE_COLORS.new_lead;
          const stageDls = stageDeals(stage.slug);
          const stageVal = stageValue(stage.slug);
          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-64"
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, stage.slug)}
            >
              <div className={`rounded-t-xl px-3 py-2.5 ${sc.bg} border-t border-x ${sc.border}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                    <span className={`text-sm font-semibold ${sc.text}`}>{stage.name}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-black/20 ${sc.text}`}>{stageDls.length}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">PKR {stageVal.toLocaleString()}</div>
              </div>
              <div className={`border-x border-b ${sc.border} rounded-b-xl min-h-[200px] p-2 space-y-2 bg-[#1a1a1a]`}>
                {stageDls.map(deal => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => setDragDeal(deal.id)}
                    className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-[#3a3a3a] transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical size={12} className="text-gray-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{deal.title}</p>
                        {deal.client_name && <p className="text-xs text-gray-500 truncate">{deal.client_name}</p>}
                        {deal.value_pkr > 0 && (
                          <p className="text-xs text-emerald-400 font-medium mt-1">PKR {Number(deal.value_pkr).toLocaleString()}</p>
                        )}
                        {deal.assigned_name && (
                          <p className="text-xs text-gray-600 mt-0.5">@{deal.assigned_name}</p>
                        )}
                      </div>
                    </div>
                    {/* Quick move */}
                    <select
                      value={deal.stage_slug}
                      onChange={e => moveStage(deal.id, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="mt-2 w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs text-gray-400 px-2 py-1 focus:outline-none"
                    >
                      {stages.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                    </select>
                  </div>
                ))}
                {stageDls.length === 0 && (
                  <div className="text-center text-gray-600 text-xs py-6">Drop deals here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add deal modal */}
      {adding && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Add Deal</h3>
              <button onClick={() => setAdding(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Deal title *"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
              <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                <option value="">Select client (optional)</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.whatsapp_number}</option>)}
              </select>
              <select value={form.stage_slug} onChange={e => setForm(f => ({ ...f, stage_slug: e.target.value }))}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                {stages.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
              </select>
              <input type="number" value={form.value_pkr} onChange={e => setForm(f => ({ ...f, value_pkr: e.target.value }))}
                placeholder="Value (PKR)"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
              <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                <option value="">Assign to (optional)</option>
                {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notes..." rows={2}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={createDeal} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Create</button>
              <button onClick={() => setAdding(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
