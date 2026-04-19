import { useState } from 'react';
import {
  Link2, CheckCircle2, XCircle, RefreshCw, Settings2, AlertTriangle,
} from 'lucide-react';

const INTEGRATIONS = [
  {
    key: 'groq',
    name: 'Groq AI',
    category: 'AI',
    icon: '⚡',
    color: '#f97316',
    active: true,
    status: 'connected',
    lastSync: '2 min ago',
    lastError: null,
    description: 'Active AI provider — Llama 3.3 70B',
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'Messaging',
    icon: '💬',
    color: '#25d366',
    active: true,
    status: 'connected',
    lastSync: '1 min ago',
    lastError: null,
    description: 'WhatsApp Business Cloud API',
  },
  {
    key: 'clickup',
    name: 'ClickUp',
    category: 'Project',
    icon: '🎯',
    color: '#7b68ee',
    active: false,
    status: 'disconnected',
    lastSync: null,
    lastError: null,
    description: 'Task and project management integration',
  },
  {
    key: 'gmail',
    name: 'Gmail',
    category: 'Email',
    icon: '📧',
    color: '#ea4335',
    active: false,
    status: 'disconnected',
    lastSync: null,
    lastError: null,
    description: 'Send emails directly from CRM',
  },
  {
    key: 'google_calendar',
    name: 'Google Calendar',
    category: 'Calendar',
    icon: '📅',
    color: '#4285f4',
    active: false,
    status: 'disconnected',
    lastSync: null,
    lastError: null,
    description: 'Sync appointments with Google Calendar',
  },
  {
    key: 'make',
    name: 'Make (Integromat)',
    category: 'Automation',
    icon: '🔄',
    color: '#6366f1',
    active: false,
    status: 'disconnected',
    lastSync: null,
    lastError: null,
    description: 'Automation workflows via Make',
  },
  {
    key: 'webhooks',
    name: 'Webhooks',
    category: 'Developer',
    icon: '🪝',
    color: '#8b5cf6',
    active: false,
    status: 'disconnected',
    lastSync: null,
    lastError: null,
    description: 'Send events to any HTTP endpoint',
  },
  {
    key: 'claude',
    name: 'Claude (Anthropic)',
    category: 'AI',
    icon: '🤖',
    color: '#a78bfa',
    active: false,
    status: 'placeholder',
    lastSync: null,
    lastError: null,
    description: 'Placeholder — add API key to enable',
  },
  {
    key: 'openai',
    name: 'OpenAI',
    category: 'AI',
    icon: '🧠',
    color: '#22d3ee',
    active: false,
    status: 'placeholder',
    lastSync: null,
    lastError: null,
    description: 'Placeholder — add API key to enable',
  },
  {
    key: 'gemini',
    name: 'Gemini (Google)',
    category: 'AI',
    icon: '✨',
    color: '#4ade80',
    active: false,
    status: 'placeholder',
    lastSync: null,
    lastError: null,
    description: 'Placeholder — add API key to enable',
  },
];

const CATEGORIES = ['All', 'AI', 'Messaging', 'Email', 'Calendar', 'Project', 'Automation', 'Developer'];

export default function Integrations() {
  const [category, setCategory] = useState('All');
  const [checking, setChecking] = useState(null);

  const filtered =
    category === 'All'
      ? INTEGRATIONS
      : INTEGRATIONS.filter((i) => i.category === category);

  const healthCheck = async (key) => {
    setChecking(key);
    await new Promise((r) => setTimeout(r, 1200));
    setChecking(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link2 size={22} className="text-indigo-400" />
        <h2 className="text-xl font-bold text-white">Integrations Hub</h2>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors ${
              category === c
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'bg-[#1a1a1a] text-gray-500 border border-[#2a2a2a] hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((intg) => {
          const isConnected = intg.status === 'connected';
          const isPlaceholder = intg.status === 'placeholder';

          return (
            <div
              key={intg.key}
              className={`bg-[#1a1a1a] border rounded-2xl p-5 flex flex-col gap-4 ${
                isPlaceholder ? 'border-[#2a2a2a] opacity-60' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
              } transition-colors`}
            >
              {/* Top */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: intg.color + '20' }}
                  >
                    {intg.icon}
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{intg.name}</p>
                    <span className="text-xs text-gray-500">{intg.category}</span>
                  </div>
                </div>
                {isConnected ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 size={12} /> Connected
                  </span>
                ) : isPlaceholder ? (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <XCircle size={12} /> Placeholder
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <XCircle size={12} /> Disconnected
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-gray-500 leading-relaxed">{intg.description}</p>

              {/* Sync info */}
              {intg.lastSync && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <RefreshCw size={10} /> Last sync: {intg.lastSync}
                </div>
              )}
              {intg.lastError && (
                <div className="flex items-center gap-1 text-xs text-red-400">
                  <AlertTriangle size={10} /> {intg.lastError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-2 border-t border-[#2a2a2a]">
                <button
                  onClick={() => healthCheck(intg.key)}
                  disabled={checking === intg.key || isPlaceholder}
                  className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-400 rounded-lg transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={11} className={checking === intg.key ? 'animate-spin' : ''} />
                  {checking === intg.key ? 'Checking…' : 'Health Check'}
                </button>
                <button
                  disabled={isPlaceholder}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                    isConnected
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  <Settings2 size={11} />
                  {isConnected ? 'Disconnect' : isPlaceholder ? 'Coming Soon' : 'Connect'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
