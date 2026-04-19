import { useEffect, useState } from 'react';
import {
  Megaphone, Plus, Play, Pause, CheckCircle2, Clock, AlertTriangle,
  FileText, Users, Edit2, X, Loader2, ChevronDown,
} from 'lucide-react';
import api from '../utils/api';

const STATUS_MAP = {
  draft:     { label: 'Draft',     color: 'bg-gray-500/20 text-gray-400',     icon: FileText },
  scheduled: { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400',     icon: Clock },
  running:   { label: 'Running',   color: 'bg-emerald-500/20 text-emerald-400', icon: Play },
  paused:    { label: 'Paused',    color: 'bg-yellow-500/20 text-yellow-400',  icon: Pause },
  completed: { label: 'Completed', color: 'bg-purple-500/20 text-purple-400',  icon: CheckCircle2 },
  failed:    { label: 'Failed',    color: 'bg-red-500/20 text-red-400',        icon: AlertTriangle },
};

const AUDIENCES = [
  { key: 'all',      label: 'All Clients' },
  { key: 'paid',     label: 'Paid Clients' },
  { key: 'inactive', label: 'Inactive (Re-engage)' },
  { key: 'leads',    label: 'Leads Only' },
];

const empty = { title: '', message: '', target_audience: 'all', scheduled_at: '', status: 'draft' };

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [aiWriting, setAiWriting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const load = () =>
    api.get('/campaigns').then((r) => setCampaigns(r.data)).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title || !form.message) return;
    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/campaigns/${form.id}`, form);
      } else {
        await api.post('/campaigns', form);
      }
      await load();
      setShowForm(false);
      setForm(empty);
    } finally {
      setSaving(false);
    }
  };

  const aiWrite = async () => {
    if (!form.title) return;
    setAiWriting(true);
    try {
      const r = await api.post('/ai/write-broadcast', {
        topic: form.title,
        tone: 'friendly',
        audience: AUDIENCES.find((a) => a.key === form.target_audience)?.label,
      });
      setForm((f) => ({ ...f, message: r.data.message }));
    } finally {
      setAiWriting(false);
    }
  };

  const filtered =
    filterStatus === 'all' ? campaigns : campaigns.filter((c) => c.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone size={22} className="text-orange-400" />
          <h2 className="text-xl font-bold text-white">Campaigns</h2>
        </div>
        <button
          onClick={() => { setForm(empty); setShowForm(true); }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {['all', ...Object.keys(STATUS_MAP)].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors ${
              filterStatus === s
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-[#1a1a1a] text-gray-500 border border-[#2a2a2a] hover:text-white'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_MAP[s]?.label}
          </button>
        ))}
      </div>

      {/* Campaign Cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-emerald-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <Megaphone size={36} className="mb-3 opacity-30" />
          <p>No campaigns yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const s = STATUS_MAP[c.status] || STATUS_MAP.draft;
            const Icon = s.icon;
            return (
              <div
                key={c.id}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 hover:border-[#3a3a3a] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-white text-sm leading-tight">{c.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ml-2 ${s.color}`}>
                    <Icon size={10} /> {s.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                  {c.message}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users size={11} />
                    {AUDIENCES.find((a) => a.key === c.target_audience)?.label || c.target_audience}
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400">{c.total_sent ?? 0} sent</span>
                    <span className="text-blue-400">{c.total_delivered ?? 0} delivered</span>
                  </div>
                </div>
                {c.scheduled_at && (
                  <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(c.scheduled_at).toLocaleString()}
                  </div>
                )}
                <div className="flex gap-2 mt-3 pt-3 border-t border-[#2a2a2a]">
                  <button
                    onClick={() => { setForm({ ...c }); setShowForm(true); }}
                    className="flex-1 text-xs py-1.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit2 size={11} /> Edit
                  </button>
                  {c.status === 'draft' && (
                    <button
                      onClick={async () => {
                        await api.put(`/campaigns/${c.id}`, { status: 'scheduled' });
                        load();
                      }}
                      className="flex-1 text-xs py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Play size={11} /> Schedule
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">
                {form.id ? 'Edit Campaign' : 'New Campaign'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Campaign Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Eid Sale Announcement"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Target Audience</label>
                <select
                  value={form.target_audience}
                  onChange={(e) => setForm((f) => ({ ...f, target_audience: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {AUDIENCES.map((a) => (
                    <option key={a.key} value={a.key}>{a.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400">Message *</label>
                  <button
                    onClick={aiWrite}
                    disabled={aiWriting || !form.title}
                    className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 disabled:opacity-40"
                  >
                    {aiWriting ? <Loader2 size={11} className="animate-spin" /> : '✨'}
                    {aiWriting ? 'Writing…' : 'AI Write'}
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Write your WhatsApp message here…"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Schedule (optional)</label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-[#2a2a2a] text-gray-300 py-2.5 rounded-xl text-sm hover:bg-[#3a3a3a] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.title || !form.message}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : form.id ? 'Update' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
