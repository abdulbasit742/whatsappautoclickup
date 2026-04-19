import { useEffect, useState } from 'react';
import { LayoutDashboard, Plus, Trash2, Save, X, BarChart2, Users, MessageSquare, CreditCard, TrendingUp, Star } from 'lucide-react';
import api from '../utils/api';

const AVAILABLE_WIDGETS = [
  { type: 'stat_clients',   label: 'Total Clients',   icon: Users,         color: 'emerald' },
  { type: 'stat_revenue',   label: 'Revenue',          icon: CreditCard,    color: 'blue' },
  { type: 'stat_messages',  label: 'Messages',         icon: MessageSquare, color: 'purple' },
  { type: 'stat_rating',    label: 'Avg Rating',       icon: Star,          color: 'yellow' },
  { type: 'chart_revenue',  label: 'Revenue Chart',    icon: TrendingUp,    color: 'emerald' },
  { type: 'chart_messages', label: 'Message Volume',   icon: BarChart2,     color: 'blue' },
];

const COLOR_CLASSES = {
  emerald: 'text-emerald-400 bg-emerald-400/10',
  blue:    'text-blue-400 bg-blue-400/10',
  purple:  'text-purple-400 bg-purple-400/10',
  yellow:  'text-yellow-400 bg-yellow-400/10',
};

export default function DashboardBuilder() {
  const [layouts, setLayouts]     = useState([]);
  const [current, setCurrent]     = useState(null);
  const [editing, setEditing]     = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving]       = useState(false);

  const load = async () => {
    const r = await api.get('/dashboard-builder');
    setLayouts(r.data);
    if (!current && r.data.length > 0) setCurrent(r.data.find(l => l.is_default) || r.data[0]);
  };

  useEffect(() => { load(); }, []);

  const createLayout = async () => {
    const r = await api.post('/dashboard-builder', { name: nameInput || 'My Dashboard', widgets: [] });
    setLayouts(prev => [...prev, r.data]);
    setCurrent(r.data);
    setEditing(false);
    setNameInput('');
  };

  const deleteLayout = async (id) => {
    if (!confirm('Delete this dashboard?')) return;
    await api.delete(`/dashboard-builder/${id}`);
    setLayouts(prev => prev.filter(l => l.id !== id));
    if (current?.id === id) setCurrent(layouts.find(l => l.id !== id) || null);
  };

  const setDefault = async (id) => {
    await api.put(`/dashboard-builder/${id}`, { ...layouts.find(l => l.id === id), is_default: true });
    load();
  };

  const addWidget = async (widget) => {
    if (!current) return;
    const widgets = [...(current.widgets || []), { ...widget, id: Date.now().toString() }];
    setSaving(true);
    const r = await api.put(`/dashboard-builder/${current.id}`, { ...current, widgets });
    setCurrent(r.data);
    setLayouts(prev => prev.map(l => l.id === r.data.id ? r.data : l));
    setSaving(false);
  };

  const removeWidget = async (widgetId) => {
    if (!current) return;
    const widgets = (current.widgets || []).filter(w => w.id !== widgetId);
    const r = await api.put(`/dashboard-builder/${current.id}`, { ...current, widgets });
    setCurrent(r.data);
    setLayouts(prev => prev.map(l => l.id === r.data.id ? r.data : l));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <LayoutDashboard size={20} className="text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Dashboard Builder</h2>
        </div>
        <button onClick={() => setEditing(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
          <Plus size={14} /> New Dashboard
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar: dashboard list */}
        <div className="w-52 shrink-0">
          <div className="space-y-1">
            {layouts.map(l => (
              <div key={l.id}
                onClick={() => setCurrent(l)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer group transition-colors ${current?.id === l.id ? 'bg-emerald-500/20 border border-emerald-500/30' : 'hover:bg-white/5'}`}
              >
                <LayoutDashboard size={14} className={current?.id === l.id ? 'text-emerald-400' : 'text-gray-500'} />
                <span className={`flex-1 text-sm truncate ${current?.id === l.id ? 'text-emerald-400' : 'text-gray-400'}`}>{l.name}</span>
                {l.is_default && <span className="text-xs text-gray-600">default</span>}
                <button onClick={(e) => { e.stopPropagation(); deleteLayout(l.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {layouts.length === 0 && <p className="text-xs text-gray-600 text-center py-4">No dashboards yet</p>}
          </div>
        </div>

        {/* Main: widget canvas */}
        <div className="flex-1">
          {!current ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-12 text-center">
              <LayoutDashboard size={32} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500 text-sm">Create a dashboard to get started</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-white">{current.name}</h3>
                  <p className="text-xs text-gray-500">{(current.widgets || []).length} widgets</p>
                </div>
                {!current.is_default && (
                  <button onClick={() => setDefault(current.id)}
                    className="text-xs text-gray-500 hover:text-emerald-400 border border-[#2a2a2a] px-3 py-1.5 rounded-lg">
                    Set as Default
                  </button>
                )}
              </div>

              {/* Widget grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 min-h-[200px]">
                {(current.widgets || []).map(w => {
                  const wDef = AVAILABLE_WIDGETS.find(aw => aw.type === w.type) || {};
                  const Icon = wDef.icon || LayoutDashboard;
                  const colorClass = COLOR_CLASSES[wDef.color || 'emerald'];
                  return (
                    <div key={w.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 group relative">
                      <button onClick={() => removeWidget(w.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity">
                        <X size={14} />
                      </button>
                      <div className={`p-2 rounded-lg ${colorClass} w-fit mb-2`}>
                        <Icon size={16} />
                      </div>
                      <p className="text-sm text-white font-medium">{wDef.label || w.label || w.type}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{w.type}</p>
                    </div>
                  );
                })}
                {(current.widgets || []).length === 0 && (
                  <div className="col-span-3 border-2 border-dashed border-[#2a2a2a] rounded-xl p-8 text-center text-gray-600">
                    Add widgets from the panel below
                  </div>
                )}
              </div>

              {/* Add widgets */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <h4 className="text-xs font-semibold text-gray-400 mb-3">Available Widgets</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {AVAILABLE_WIDGETS.map(w => {
                    const Icon = w.icon;
                    const already = (current.widgets || []).some(cw => cw.type === w.type);
                    return (
                      <button key={w.type} onClick={() => !already && addWidget(w)} disabled={already || saving}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-colors ${already ? 'border-[#2a2a2a] text-gray-600 cursor-not-allowed' : 'border-[#2a2a2a] text-gray-400 hover:text-white hover:border-emerald-500/30 hover:bg-emerald-500/5'}`}>
                        <Icon size={13} />
                        {w.label}
                        {already && <span className="ml-auto text-gray-600">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create dashboard modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">New Dashboard</h3>
            <input value={nameInput} onChange={e => setNameInput(e.target.value)}
              placeholder="Dashboard name..."
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 mb-4" />
            <div className="flex gap-3">
              <button onClick={createLayout} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Create</button>
              <button onClick={() => setEditing(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
