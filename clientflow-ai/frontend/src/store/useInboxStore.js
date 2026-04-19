import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import api from '../utils/api';

const useInboxStore = create(
  devtools(
    (set, get) => ({
      // ── State ─────────────────────────────────────────────────────────────
      clients: [],
      filtered: [],
      selected: null,
      messages: [],
      reply: '',
      search: '',
      filter: 'all',        // all | unread | assigned | archived
      aiLoading: false,
      sendLoading: false,
      loadingMessages: false,

      // ── Setters ───────────────────────────────────────────────────────────
      setReply: (v) => set({ reply: v }),
      setSearch: (v) => {
        set({ search: v });
        get()._applyFilter(get().clients, v, get().filter);
      },
      setFilter: (v) => {
        set({ filter: v });
        get()._applyFilter(get().clients, get().search, v);
      },

      _applyFilter: (clients, search, filter) => {
        const q = search.toLowerCase();
        let list = clients.filter(
          (c) =>
            (c.name || '').toLowerCase().includes(q) ||
            c.whatsapp_number.includes(q)
        );
        if (filter === 'unread')   list = list.filter((c) => c.unread_count > 0);
        if (filter === 'assigned') list = list.filter((c) => c.assigned_to);
        if (filter === 'archived') list = list.filter((c) => c.status === 'inactive');
        set({ filtered: list });
      },

      // ── Async actions ─────────────────────────────────────────────────────
      loadClients: async () => {
        const r = await api.get('/clients');
        const clients = r.data;
        set({ clients });
        get()._applyFilter(clients, get().search, get().filter);
      },

      selectClient: async (client) => {
        set({ selected: client, loadingMessages: true, messages: [] });
        try {
          const r = await api.get(`/clients/${client.id}/messages`);
          set({ messages: r.data });
        } finally {
          set({ loadingMessages: false });
        }
      },

      sendMessage: async () => {
        const { reply, selected, messages } = get();
        if (!reply.trim() || !selected) return;
        set({ sendLoading: true });
        try {
          await api.post(`/clients/${selected.id}/send`, { message: reply });
          set({
            reply: '',
            messages: [
              ...messages,
              {
                id: Date.now(),
                direction: 'outbound',
                content: reply,
                created_at: new Date().toISOString(),
              },
            ],
          });
        } finally {
          set({ sendLoading: false });
        }
      },

      suggestReply: async () => {
        const { selected, messages } = get();
        if (!selected) return;
        set({ aiLoading: true });
        try {
          const lastMsg =
            messages.filter((m) => m.direction === 'inbound').slice(-1)[0]
              ?.content || '';
          const r = await api.post('/ai/suggest-reply', {
            clientId: selected.id,
            lastMessage: lastMsg,
          });
          set({ reply: r.data.reply });
        } finally {
          set({ aiLoading: false });
        }
      },

      appendInboundMessage: (msg) =>
        set((state) => ({ messages: [...state.messages, msg] })),
    }),
    { name: 'InboxStore' }
  )
);

export default useInboxStore;
