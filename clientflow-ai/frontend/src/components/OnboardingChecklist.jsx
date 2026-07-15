import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../utils/api';

const ORG_ID = 'demo-org';
const USER_ID = 'demo-user';

const LABELS = {
  complete_profile: { label: 'Complete your profile', desc: 'Add your name and photo', href: '/settings' },
  connect_ai: { label: 'Connect AI provider', desc: 'Link OpenAI, Gemini or Claude', href: '/settings' },
  import_contacts: { label: 'Import contacts', desc: 'Upload your existing clients', href: '/clients' },
  invite_team: { label: 'Invite team member', desc: 'Grow your workspace', href: '/team' },
  create_campaign: { label: 'Create first campaign', desc: 'Send your first broadcast', href: '/broadcasts' },
  open_inbox: { label: 'Open inbox', desc: 'Reply to a client message', href: '/inbox' },
};

export default function OnboardingChecklist({ collapsed: initCollapsed = false }) {
  const [progress, setProgress] = useState([]);
  const [percent, setPercent] = useState(0);
  const [collapsed, setCollapsed] = useState(initCollapsed);

  async function load() {
    try {
      const r = await api.get(`/onboarding/${ORG_ID}/${USER_ID}`);
      setProgress(r.data.progress || []);
      setPercent(r.data.percent || 0);
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function complete(item) {
    try {
      await api.post(`/onboarding/${ORG_ID}/${USER_ID}/complete`, { item });
      load();
    } catch {}
  }

  if (percent === 100 && collapsed) return null;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm">Getting Started</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{percent}%</span>
          </div>
          <div className="w-32 bg-[#2a2a2a] rounded-full h-1.5">
            <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
        {collapsed ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronUp size={14} className="text-gray-400" />}
      </button>

      {!collapsed && (
        <div className="px-5 pb-4 space-y-2">
          {progress.map(({ item, completed }) => {
            const meta = LABELS[item] || { label: item, desc: '', href: '#' };
            return (
              <div key={item} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${completed ? 'opacity-50' : 'hover:bg-white/5'}`}
                onClick={() => !completed && complete(item)}>
                {completed
                  ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  : <Circle size={16} className="text-gray-600 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${completed ? 'line-through text-gray-500' : 'text-white'}`}>{meta.label}</div>
                  <div className="text-xs text-gray-500">{meta.desc}</div>
                </div>
                {!completed && (
                  <a href={meta.href} onClick={e => e.stopPropagation()} className="text-xs text-emerald-400 hover:underline shrink-0">Go →</a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
