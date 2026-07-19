import { useEffect } from 'react';
import useInboxStore from '../store/useInboxStore';
import ChatSidebar from '../components/ChatSidebar';
import ConversationPanel from '../components/ConversationPanel';
import ClientIntelPanel from '../components/ClientIntelPanel';

export default function Inbox() {
  const { loadClients } = useInboxStore();

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  return (
    <div className="flex h-full -m-6 overflow-hidden rounded-xl">
      <ChatSidebar />
      <ConversationPanel />
      <ClientIntelPanel />
    </div>
  );
}
