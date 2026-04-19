import { useState, useEffect } from 'react';
import {
  Tag, Star, DollarSign, FileText, Brain, Zap, ChevronDown,
  ChevronUp, Phone, Mail, User, TrendingUp, Clock, AlertCircle,
  CheckCircle2, XCircle,
} from 'lucide-react';
import api from '../utils/api';
import useInboxStore from '../store/useInboxStore';

const SCORE_COLOR = (s) => {
  if (s >= 75) return 'text-emerald-400';
  if (s >= 40) return 'text-yellow-400';
  return 'text-red-400';
};

const PAYMENT_BADGE = {
  paid:     { label: 'Paid',     color: 'bg-emerald-500/20 text-emerald-400' },
  pending:  { label: 'Pending',  color: 'bg-yellow-500/20 text-yellow-400' },
  inactive: { label: 'Inactive', color: 'bg-gray-500/20 text-gray-400' },
  lead:     { label: 'Lead',     color: 'bg-blue-500/20 text-blue-400' },
};

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#2a3942]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <Icon size={12} />
          {title}
        </div>
        {open ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-500" />}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

export default function ClientIntelPanel() {
  const { selected } = useInboxStore();
  const [profile, setProfile] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!selected) { setProfile(null); return; }
    api.get(`/clients/${selected.id}`).then((r) => setProfile(r.data)).catch(() => {});
  }, [selected]);

  const generateSummary = async () => {
    if (!selected) return;
    setSummaryLoading(true);
    try {
      const r = await api.post('/ai/suggest-reply', {
        clientId: selected.id,
        lastMessage: 'Give me a short 2-sentence summary of this client relationship and status.',
      });
      setAiSummary(r.data.reply);
    } finally {
      setSummaryLoading(false);
    }
  };

  const saveNote = async () => {
    if (!note.trim() || !selected) return;
    setSavingNote(true);
    try {
      await api.put(`/clients/${selected.id}`, { notes: note });
      setProfile((p) => p ? { ...p, notes: note } : p);
      setNote('');
    } finally {
      setSavingNote(false);
    }
  };

  if (!selected) {
    return (
      <div className="w-72 shrink-0 bg-[#111b21] border-l border-[#2a3942] flex items-center justify-center text-gray-600 text-sm">
        <div className="text-center p-4">
          <User size={28} className="mx-auto mb-2 opacity-30" />
          <p>Select a contact</p>
        </div>
      </div>
    );
  }

  const client = profile || selected;
  const leadScore = client.lead_score ?? Math.round((client.total_spent_pkr || 0) > 0 ? 80 : 30);
  const payBadge = PAYMENT_BADGE[client.status] || PAYMENT_BADGE.lead;

  return (
    <div className="w-72 shrink-0 bg-[#111b21] border-l border-[#2a3942] flex flex-col overflow-y-auto">
      {/* Contact Header */}
      <div className="p-4 border-b border-[#2a3942] text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center text-xl font-bold text-emerald-400 mx-auto mb-2">
          {(client.name || client.whatsapp_number).slice(0, 2).toUpperCase()}
        </div>
        <p className="font-semibold text-white">{client.name || 'Unknown'}</p>
        <p className="text-xs text-gray-500 mt-0.5">{client.whatsapp_number}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${payBadge.color}`}>
            {payBadge.label}
          </span>
        </div>
      </div>

      {/* Lead Score */}
      <Section title="Lead Score" icon={TrendingUp}>
        <div className="flex items-center gap-3 mt-1">
          <div className="relative w-14 h-14 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2a3942" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={leadScore >= 75 ? '#10b981' : leadScore >= 40 ? '#f59e0b' : '#ef4444'}
                strokeWidth="3"
                strokeDasharray={`${leadScore} ${100 - leadScore}`}
                strokeLinecap="round"
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${SCORE_COLOR(leadScore)}`}>
              {leadScore}
            </span>
          </div>
          <div>
            <p className={`text-sm font-semibold ${SCORE_COLOR(leadScore)}`}>
              {leadScore >= 75 ? 'Hot Lead 🔥' : leadScore >= 40 ? 'Warm Lead' : 'Cold Lead'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              PKR {(client.total_spent_pkr || 0).toLocaleString()} total
            </p>
          </div>
        </div>
      </Section>

      {/* Contact Info */}
      <Section title="Contact Info" icon={User}>
        <div className="space-y-2 mt-1">
          {client.email && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Mail size={11} className="shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Phone size={11} className="shrink-0" />
            <span>{client.whatsapp_number}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock size={11} className="shrink-0" />
            <span>
              Active{' '}
              {client.last_active_at
                ? new Date(client.last_active_at).toLocaleDateString()
                : 'never'}
            </span>
          </div>
        </div>
      </Section>

      {/* Payment Status */}
      <Section title="Payment" icon={DollarSign}>
        <div className="space-y-2 mt-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Total Spent</span>
            <span className="text-sm font-semibold text-emerald-400">
              PKR {(client.total_spent_pkr || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Status</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${payBadge.color}`}>
              {payBadge.label}
            </span>
          </div>
        </div>
      </Section>

      {/* Tags */}
      <Section title="Tags" icon={Tag}>
        <div className="flex flex-wrap gap-1 mt-1">
          {(client.tags || [client.status]).filter(Boolean).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20"
            >
              #{tag}
            </span>
          ))}
        </div>
      </Section>

      {/* Notes */}
      <Section title="Notes" icon={FileText}>
        {client.notes && (
          <p className="text-xs text-gray-400 bg-[#202c33] rounded-lg p-2 mb-2 leading-relaxed">
            {client.notes}
          </p>
        )}
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          className="w-full bg-[#202c33] border border-[#2a3942] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 resize-none"
        />
        <button
          onClick={saveNote}
          disabled={savingNote || !note.trim()}
          className="mt-1.5 w-full text-xs py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors disabled:opacity-40"
        >
          {savingNote ? 'Saving…' : 'Save Note'}
        </button>
      </Section>

      {/* AI Summary */}
      <Section title="AI Intelligence" icon={Brain}>
        {aiSummary ? (
          <div className="text-xs text-gray-400 bg-purple-500/5 border border-purple-500/20 rounded-lg p-2 leading-relaxed mt-1">
            {aiSummary}
          </div>
        ) : (
          <button
            onClick={generateSummary}
            disabled={summaryLoading}
            className="w-full mt-1 text-xs py-2 flex items-center justify-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors disabled:opacity-50"
          >
            {summaryLoading ? (
              <><span className="animate-spin">⏳</span> Generating…</>
            ) : (
              <><Brain size={12} /> Generate AI Summary</>
            )}
          </button>
        )}
      </Section>

      {/* Next Recommended Action */}
      <Section title="Next Action" icon={Zap} defaultOpen={true}>
        <div className="mt-1 space-y-2">
          {client.status === 'lead' && (
            <div className="flex items-start gap-2 text-xs bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
              <AlertCircle size={12} className="text-yellow-400 shrink-0 mt-0.5" />
              <span className="text-yellow-300">Send intro message + service details</span>
            </div>
          )}
          {client.status === 'active' && (
            <div className="flex items-start gap-2 text-xs bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
              <DollarSign size={12} className="text-blue-400 shrink-0 mt-0.5" />
              <span className="text-blue-300">Follow up on pending payment</span>
            </div>
          )}
          {client.status === 'paid' && (
            <div className="flex items-start gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-emerald-300">Send upsell or request a review</span>
            </div>
          )}
          {client.status === 'inactive' && (
            <div className="flex items-start gap-2 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              <XCircle size={12} className="text-red-400 shrink-0 mt-0.5" />
              <span className="text-red-300">Run re-engagement campaign</span>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
