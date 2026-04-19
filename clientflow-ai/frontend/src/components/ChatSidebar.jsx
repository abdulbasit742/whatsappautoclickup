import { Search, Filter, Inbox, Bell, Archive, UserCheck } from 'lucide-react';
import useInboxStore from '../store/useInboxStore';
import { formatDistanceToNow } from 'date-fns';

const STATUS_COLORS = {
  paid:     'bg-emerald-500',
  active:   'bg-blue-500',
  lead:     'bg-yellow-500',
  inactive: 'bg-gray-500',
  blocked:  'bg-red-500',
};

const FILTERS = [
  { key: 'all',      icon: Inbox,     label: 'All' },
  { key: 'unread',   icon: Bell,      label: 'Unread' },
  { key: 'assigned', icon: UserCheck, label: 'Assigned' },
  { key: 'archived', icon: Archive,   label: 'Archived' },
];

export default function ChatSidebar() {
  const { filtered, selected, search, filter, setSearch, setFilter, selectClient } =
    useInboxStore();

  return (
    <div className="w-72 shrink-0 flex flex-col bg-[#111b21] border-r border-[#2a3942]">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-semibold text-white mb-3">Inbox</h2>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full bg-[#202c33] border-0 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1">
          {FILTERS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === key
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <Icon size={11} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm">
            <Filter size={24} className="mb-2 opacity-50" />
            No conversations
          </div>
        )}

        {filtered.map((c) => {
          const isActive = selected?.id === c.id;
          const initials = (c.name || c.whatsapp_number).slice(0, 2).toUpperCase();
          return (
            <button
              key={c.id}
              onClick={() => selectClient(c)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-[#2a3942]/50 transition-colors ${
                isActive
                  ? 'bg-[#2a3942]'
                  : 'hover:bg-[#182229]'
              }`}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400">
                  {initials}
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#111b21] ${
                    STATUS_COLORS[c.status] || 'bg-gray-500'
                  }`}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white truncate">
                    {c.name || c.whatsapp_number}
                  </span>
                  {c.last_active_at && (
                    <span className="text-xs text-gray-500 shrink-0 ml-1">
                      {formatDistanceToNow(new Date(c.last_active_at), { addSuffix: false })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-gray-500 truncate">
                    {c.whatsapp_number}
                  </span>
                  {c.unread_count > 0 && (
                    <span className="bg-emerald-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center shrink-0 ml-1">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
