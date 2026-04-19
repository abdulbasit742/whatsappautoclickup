import { useState } from 'react';
import { Sparkles, Send, Megaphone, Activity, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../components/Toast';

const TONES = ['friendly', 'professional', 'urgent', 'casual'];
const AUDIENCES = ['all clients', 'paid clients', 'leads', 'inactive clients'];

export default function AICenter() {
  const toast = useToast();

  // Broadcast writer
  const [topic, setTopic]       = useState('');
  const [tone, setTone]         = useState('friendly');
  const [audience, setAudience] = useState('all clients');
  const [generated, setGenerated] = useState('');
  const [writing, setWriting]   = useState(false);

  // Quick reply
  const [lastMsg, setLastMsg]   = useState('');
  const [suggested, setSuggested] = useState('');
  const [suggesting, setSuggesting] = useState(false);

  // Health
  const [health, setHealth]     = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const writeBroadcast = async () => {
    if (!topic.trim()) return;
    setWriting(true);
    setGenerated('');
    try {
      const r = await api.post('/ai/write-broadcast', { topic, tone, audience });
      setGenerated(r.data.message);
      toast(`Generated using ${r.data.provider}`, 'success');
    } catch (e) {
      toast(e.response?.data?.error || 'AI request failed', 'error');
    } finally { setWriting(false); }
  };

  const suggestReply = async () => {
    if (!lastMsg.trim()) return;
    setSuggesting(true);
    setSuggested('');
    try {
      const r = await api.post('/ai/suggest-reply', { lastMessage: lastMsg });
      setSuggested(r.data.reply);
      toast(`Suggestion from ${r.data.provider}`, 'success');
    } catch (e) {
      toast(e.response?.data?.error || 'AI request failed', 'error');
    } finally { setSuggesting(false); }
  };

  const checkHealth = async () => {
    setHealthLoading(true);
    try {
      const r = await api.get('/ai/health');
      setHealth(r.data);
    } catch (e) {
      toast('Failed to fetch AI health', 'error');
    } finally { setHealthLoading(false); }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast('Copied to clipboard', 'success');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Sparkles size={22} className="text-emerald-400" />
        <h2 className="text-xl font-bold text-white">AI Center</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Broadcast Writer ── */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={16} className="text-emerald-400" />
            <h3 className="font-semibold text-white text-sm">Broadcast Message Writer</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Topic / Offer</label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Eid sale, new service launch, follow-up offer..."
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tone</label>
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Audience</label>
                <select
                  value={audience}
                  onChange={e => setAudience(e.target.value)}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={writeBroadcast}
              disabled={writing || !topic.trim()}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Sparkles size={14} /> {writing ? 'Writing...' : 'Generate Message'}
            </button>

            {generated && (
              <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-3">
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{generated}</p>
                <button
                  onClick={() => copy(generated)}
                  className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Copy to clipboard
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Reply Suggestion ── */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Send size={16} className="text-blue-400" />
            <h3 className="font-semibold text-white text-sm">Quick Reply Suggestion</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Client's last message</label>
              <textarea
                value={lastMsg}
                onChange={e => setLastMsg(e.target.value)}
                rows={4}
                placeholder="Paste the client's message here..."
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <button
              onClick={suggestReply}
              disabled={suggesting || !lastMsg.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Sparkles size={14} /> {suggesting ? 'Thinking...' : 'Suggest Reply'}
            </button>

            {suggested && (
              <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-3">
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{suggested}</p>
                <button
                  onClick={() => copy(suggested)}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Copy to clipboard
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── AI Provider Health ── */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-yellow-400" />
              <h3 className="font-semibold text-white text-sm">Provider Status</h3>
            </div>
            <button
              onClick={checkHealth}
              disabled={healthLoading}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronRight size={12} /> {healthLoading ? 'Checking...' : 'Check Now'}
            </button>
          </div>

          {health ? (
            <div className="space-y-3">
              {Object.entries(health).map(([name, info]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 capitalize">{name}</span>
                  <div className="flex items-center gap-2">
                    {info.lastError && (
                      <span className="text-xs text-gray-500 max-w-[140px] truncate" title={info.lastError}>
                        {info.lastError}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      info.available
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {info.available ? '● Online' : '● Offline'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Click "Check Now" to view AI provider status.</p>
          )}
        </div>

        {/* ── AI Tips ── */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-purple-400" />
            <h3 className="font-semibold text-white text-sm">How AI is Used</h3>
          </div>
          <ul className="space-y-3">
            {[
              { label: 'Auto-reply', desc: 'Incoming WhatsApp messages get AI-generated responses' },
              { label: 'Follow-up upsell', desc: 'AI writes personalised upsell messages for completed clients' },
              { label: 'Broadcast writer', desc: 'Generate WhatsApp marketing messages instantly' },
              { label: 'Reply suggestion', desc: 'Get AI-suggested replies for complex queries' },
              { label: 'Fallback chain', desc: 'Claude → OpenAI → Gemini → Groq (auto failover)' },
            ].map(item => (
              <li key={item.label} className="flex gap-3">
                <span className="text-xs font-semibold text-emerald-400 shrink-0 mt-0.5">{item.label}</span>
                <span className="text-xs text-gray-400">{item.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
