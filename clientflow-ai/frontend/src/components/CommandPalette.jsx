import { useEffect, useState, useRef } from 'react';
import { Command, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ACTIONS = [
  { id: 'dashboard',    label: 'Go to Dashboard',      path: '/' },
  { id: 'clients',      label: 'Open Inbox / Clients', path: '/clients' },
  { id: 'team',         label: 'Manage Team',           path: '/team' },
  { id: 'broadcasts',   label: 'Create Campaign',       path: '/broadcasts' },
  { id: 'settings',     label: 'Open Settings',         path: '/settings' },
  { id: 'issues',       label: 'View Issues',           path: '/issues' },
  { id: 'notifications',label: 'View Notifications',    path: '/notifications' },
  { id: 'workflows',    label: 'Workflow Builder',      path: '/workflows' },
  { id: 'exports',      label: 'Export Reports',        path: '/exports' },
  { id: 'permissions',  label: 'Manage Permissions',    path: '/permissions' },
  { id: 'onboarding',   label: 'Onboarding Setup',      path: '/onboarding' },
  { id: 'segments',     label: 'Saved Segments',        path: '/segments' },
  { id: 'templates',    label: 'Template Library',      path: '/template-library' },
  { id: 'ai-prompts',   label: 'AI Prompt Library',     path: '/ai-prompts' },
  { id: 'tags',         label: 'Tag Manager',           path: '/tags' },
];

export default function CommandPalette({ onClose }) {
  const [q, setQ]               = useState('');
  const inputRef                = useRef(null);
  const [selected, setSelected] = useState(0);
  const navigate                = useNavigate();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = q
    ? ACTIONS.filter(a => a.label.toLowerCase().includes(q.toLowerCase()))
    : ACTIONS;

  useEffect(() => { setSelected(0); }, [q]);

  const run = (action) => { navigate(action.path); onClose(); };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s+1, filtered.length-1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s-1, 0)); }
    if (e.key === 'Enter')     { if (filtered[selected]) run(filtered[selected]); }
    if (e.key === 'Escape')    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 pt-24 px-4" onClick={onClose}>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a]">
          <Command size={15} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
          />
          <kbd className="text-xs text-gray-600 border border-[#333] px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.map((action, idx) => (
            <button key={action.id} onClick={() => run(action)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left group ${idx === selected ? 'bg-emerald-500/10' : 'hover:bg-[#222]'}`}>
              <ArrowRight size={12} className={idx === selected ? 'text-emerald-400' : 'text-gray-600'} />
              <span className={`text-sm ${idx === selected ? 'text-emerald-300' : 'text-white'}`}>{action.label}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="text-center text-gray-500 py-6 text-sm">No commands found.</div>}
        </div>

        <div className="px-4 py-2 border-t border-[#2a2a2a] flex gap-4 text-xs text-gray-600">
          <span>↑↓ Navigate</span><span>↵ Select</span><span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}
