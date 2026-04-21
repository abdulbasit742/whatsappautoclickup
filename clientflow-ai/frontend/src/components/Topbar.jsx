import { Bell, Search, Bot, UserCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function Topbar() {
  const [provider, setProvider] = useState('N/A');
  useEffect(() => {
    api.get('/ai/health').then(r => {
      const active = Object.entries(r.data || {}).find(([, v]) => v.available)?.[0];
      setProvider(active || 'offline');
    }).catch(() => {});
  }, []);

  return (
    <header className="h-14 border-b border-[#2a2a2a] bg-[#141414] px-4 flex items-center gap-3">
      <div className="relative w-80 max-w-[45vw]">
        <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
        <input placeholder="Search chats, leads, campaigns..." className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 flex items-center gap-1">
          <Bot size={12} />
          AI: {provider}
        </span>
        <button className="text-gray-400 hover:text-white"><Bell size={16} /></button>
        <button className="text-gray-400 hover:text-white"><UserCircle2 size={18} /></button>
      </div>
    </header>
  );
}
