import { format } from 'date-fns';

export default function ChatBubble({ msg }) {
  const isOut = msg.direction === 'outbound';
  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
        isOut ? 'bg-emerald-500 text-white rounded-br-sm' : 'bg-[#2a2a2a] text-gray-200 rounded-bl-sm'
      }`}>
        <p>{msg.content}</p>
        <p className={`text-xs mt-1 ${isOut ? 'text-emerald-100' : 'text-gray-500'}`}>
          {format(new Date(msg.created_at), 'HH:mm')}
          {isOut && msg.ai_provider_used && (
            <span className="ml-1 opacity-70">· {msg.ai_provider_used}</span>
          )}
        </p>
      </div>
    </div>
  );
}
