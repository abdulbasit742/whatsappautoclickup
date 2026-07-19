import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { User, MessageCircle, Tag, StickyNote, TrendingUp, AlertTriangle, DollarSign, Paperclip, Clock, Zap } from 'lucide-react';
import api from '../utils/api';

const TIER_COLORS = { hot: 'bg-red-500/20 text-red-400', warm: 'bg-yellow-500/20 text-yellow-400', cold: 'bg-blue-500/20 text-blue-400' };
const SENTIMENT_COLORS = { positive: 'text-emerald-400', negative: 'text-red-400', neutral: 'text-gray-400', urgent: 'text-orange-400', confused: 'text-yellow-400' };

export default function Customer360() {
  const { id } = useParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    api.get(`/customer360/${id}`).then(r => setData(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-gray-400">Loading profile...</div>;
  if (!data)   return <div className="text-red-400">Client not found.</div>;

  const { client, messages, notes, issues, payments, followups, timeline, attachments, recommendations } = data;

  const tabs = ['overview','messages','notes','issues','payments','files','timeline','ai'];

  return (
    <div>
      {/* Header */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xl">
            {client.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{client.name || 'Unknown'}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-gray-400 text-sm">{client.whatsapp_number}</span>
              {client.email && <span className="text-gray-400 text-sm">{client.email}</span>}
              {client.lead_tier && <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_COLORS[client.lead_tier]}`}>{client.lead_tier.toUpperCase()}</span>}
              {client.sentiment && <span className={`text-xs font-medium ${SENTIMENT_COLORS[client.sentiment]}`}>● {client.sentiment}</span>}
              {client.lead_score != null && (
                <span className="text-xs bg-[#2a2a2a] px-2 py-0.5 rounded-full text-gray-300">Score: {client.lead_score}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      {recommendations?.length > 0 && (
        <div className="mb-6 space-y-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Zap size={14} className="text-yellow-400" /> Next Best Actions</h3>
          <div className="flex gap-2 flex-wrap">
            {recommendations.map(r => (
              <div key={r.id} className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2 text-xs text-yellow-300">
                <span className="font-medium capitalize">{r.action.replace(/_/g,' ')}</span>
                <span className="text-yellow-500 ml-2">{r.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${activeTab === t ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Messages" value={messages?.length || 0} icon={MessageCircle} color="blue" />
            <Stat label="Open Issues" value={issues?.filter(i => i.status==='open').length || 0} icon={AlertTriangle} color="red" />
            <Stat label="Notes" value={notes?.length || 0} icon={StickyNote} color="purple" />
            <Stat label="Payments" value={payments?.length || 0} icon={DollarSign} color="emerald" />
            <Stat label="Follow-ups" value={followups?.length || 0} icon={Clock} color="orange" />
            <Stat label="Attachments" value={attachments?.length || 0} icon={Paperclip} color="yellow" />
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${m.direction === 'outbound' ? 'bg-emerald-500/20 text-emerald-100' : 'bg-[#2a2a2a] text-white'}`}>
                  <p>{m.content}</p>
                  <p className="text-xs opacity-50 mt-1">{new Date(m.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            {notes.map(n => (
              <div key={n.id} className={`border rounded-xl p-3 ${n.is_pinned ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-[#2a2a2a]'}`}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{n.author_name || 'Unknown'}</span>
                  <span>{n.is_pinned ? '📌 ' : ''}{new Date(n.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-white">{n.content}</p>
              </div>
            ))}
            {!notes.length && <p className="text-gray-500 text-sm">No notes yet.</p>}
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="space-y-3">
            {issues.map(i => (
              <div key={i.id} className="border border-[#2a2a2a] rounded-xl p-3">
                <div className="flex justify-between">
                  <span className="text-white text-sm font-medium">{i.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${i.status === 'open' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{i.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{i.priority} priority · {new Date(i.created_at).toLocaleDateString()}</p>
              </div>
            ))}
            {!issues.length && <p className="text-gray-500 text-sm">No issues.</p>}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-3">
            {payments.map(p => (
              <div key={p.id} className="flex justify-between border border-[#2a2a2a] rounded-xl p-3">
                <div>
                  <span className="text-white text-sm">{p.description || 'Payment'}</span>
                  <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className="text-white font-medium">PKR {(p.amount||0).toLocaleString()}</span>
                  <p className={`text-xs ${p.status === 'paid' ? 'text-emerald-400' : 'text-yellow-400'}`}>{p.status}</p>
                </div>
              </div>
            ))}
            {!payments.length && <p className="text-gray-500 text-sm">No payments.</p>}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-2">
            {attachments.map(a => (
              <div key={a.id} className="flex items-center justify-between border border-[#2a2a2a] rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <Paperclip size={16} className="text-gray-400" />
                  <div>
                    <div className="text-sm text-white">{a.original_name || a.filename}</div>
                    <div className="text-xs text-gray-500">{a.mime_type} · {Math.round((a.file_size||0)/1024)}KB</div>
                  </div>
                </div>
                <a href={a.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300">Download</a>
              </div>
            ))}
            {!attachments.length && <p className="text-gray-500 text-sm">No files.</p>}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {timeline.map(t => (
              <div key={t.id} className="flex gap-3">
                <div className="w-1 rounded-full bg-emerald-500/30 shrink-0" />
                <div>
                  <span className="text-xs text-emerald-400 capitalize">{t.event_type.replace(/_/g,' ')}</span>
                  <p className="text-xs text-gray-500">{new Date(t.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#111] rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">Lead Score</div>
                <div className="text-3xl font-bold text-white">{client.lead_score ?? 0}</div>
                <div className={`text-xs mt-1 ${TIER_COLORS[client.lead_tier]?.split(' ')[1] || 'text-gray-400'}`}>{client.lead_tier?.toUpperCase() || 'COLD'}</div>
              </div>
              <div className="bg-[#111] rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">Sentiment</div>
                <div className={`text-2xl font-bold capitalize ${SENTIMENT_COLORS[client.sentiment] || 'text-gray-400'}`}>{client.sentiment || 'Neutral'}</div>
                <div className="text-xs text-gray-500 mt-1">Score: {client.sentiment_score ?? 0}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, color }) {
  const colors = { blue: 'text-blue-400 bg-blue-500/10', red: 'text-red-400 bg-red-500/10', purple: 'text-purple-400 bg-purple-500/10', emerald: 'text-emerald-400 bg-emerald-500/10', orange: 'text-orange-400 bg-orange-500/10', yellow: 'text-yellow-400 bg-yellow-500/10' };
  const [text, bg] = (colors[color] || 'text-gray-400 bg-gray-500/10').split(' ');
  return (
    <div className={`${bg} rounded-xl p-4`}>
      <Icon size={16} className={`${text} mb-2`} />
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}
