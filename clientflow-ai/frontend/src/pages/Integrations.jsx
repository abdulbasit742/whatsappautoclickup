import { useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, ExternalLink, Zap } from 'lucide-react';

const INTEGRATIONS = [
  {
    id: 'gmail',      name: 'Gmail',            icon: '📧', category: 'Communication',
    status: 'connected',  desc: 'Send & receive emails from CRM',
    detail: 'Last sync: just now',   color: 'emerald',
  },
  {
    id: 'gcal',       name: 'Google Calendar',  icon: '📅', category: 'Productivity',
    status: 'connected',  desc: 'Sync appointments & follow-ups',
    detail: '12 events synced',      color: 'emerald',
  },
  {
    id: 'clickup',    name: 'ClickUp',           icon: '✅', category: 'Productivity',
    status: 'connected',  desc: 'Create & manage tasks from CRM',
    detail: '5 tasks synced',        color: 'emerald',
  },
  {
    id: 'make',       name: 'Make (Integromat)', icon: '⚙️', category: 'Automation',
    status: 'disconnected', desc: 'Automate workflows between apps',
    detail: 'Not connected',         color: 'gray',
  },
  {
    id: 'stripe',     name: 'Stripe',            icon: '💳', category: 'Payments',
    status: 'connected',  desc: 'Process payments & track invoices',
    detail: '89 transactions',       color: 'emerald',
  },
  {
    id: 'whatsapp',   name: 'WhatsApp Business', icon: '💬', category: 'Communication',
    status: 'connected',  desc: 'Real-time messaging hub',
    detail: '234 messages today',    color: 'emerald',
  },
  {
    id: 'groq',       name: 'Groq AI',           icon: '⚡', category: 'AI',
    status: 'active',     desc: 'Primary AI provider (llama3-70b)',
    detail: 'Key: ••••1234',         color: 'emerald',
  },
  {
    id: 'openai',     name: 'OpenAI',            icon: '🤖', category: 'AI',
    status: 'soon',       desc: 'GPT-4o — coming soon',
    detail: 'API key placeholder',   color: 'gray',
  },
  {
    id: 'claude',     name: 'Claude (Anthropic)', icon: '🔮', category: 'AI',
    status: 'soon',       desc: 'claude-3-opus — coming soon',
    detail: 'API key placeholder',   color: 'gray',
  },
  {
    id: 'gemini',     name: 'Gemini (Google)',   icon: '💎', category: 'AI',
    status: 'soon',       desc: 'gemini-1.5-pro — coming soon',
    detail: 'API key placeholder',   color: 'gray',
  },
];

const STATUS_MAP = {
  connected:    { label: 'Connected',   cls: 'bg-emerald-500/20 text-emerald-400' },
  active:       { label: 'Active',      cls: 'bg-emerald-500/20 text-emerald-400' },
  disconnected: { label: 'Not Connected', cls: 'bg-gray-500/20 text-gray-400' },
  soon:         { label: 'Coming Soon', cls: 'bg-blue-500/20 text-blue-400' },
};

export default function Integrations() {
  const [items, setItems] = useState(INTEGRATIONS);

  const toggle = id => {
    setItems(is => is.map(i =>
      i.id === id && i.status !== 'soon'
        ? { ...i, status: i.status === 'disconnected' ? 'connected' : 'disconnected' }
        : i
    ));
  };

  const categories = [...new Set(items.map(i => i.category))];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-gray-400 mt-1">Connect your tools to supercharge ClientFlow AI</p>
      </div>

      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{cat}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.filter(i => i.category === cat).map(item => {
              const s = STATUS_MAP[item.status] || STATUS_MAP.disconnected;
              const isOn = item.status === 'connected' || item.status === 'active';
              return (
                <div
                  key={item.id}
                  className={`bg-[#1a1a1a] rounded-xl p-5 border transition-colors ${
                    isOn ? 'border-emerald-500/30' : 'border-[#2a2a2a]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.cls}`}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                    {isOn && (
                      <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mb-1">{item.desc}</p>
                  <p className="text-[10px] text-gray-600 mb-4">{item.detail}</p>

                  <div className="flex gap-2">
                    {item.status === 'soon' ? (
                      <button disabled className="flex-1 text-xs bg-[#2a2a2a] text-gray-600 py-1.5 rounded-lg cursor-not-allowed">
                        Coming Soon
                      </button>
                    ) : isOn ? (
                      <button
                        onClick={() => toggle(item.id)}
                        className="flex-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 py-1.5 rounded-lg border border-red-500/20 transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => toggle(item.id)}
                        className="flex-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-1.5 rounded-lg border border-emerald-500/20 transition-colors"
                      >
                        Connect
                      </button>
                    )}
                    {item.status !== 'soon' && (
                      <button className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Settings">
                        <RefreshCw size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
