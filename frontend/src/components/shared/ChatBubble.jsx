import { format } from 'date-fns'
import Avatar from '../ui/Avatar.jsx'
import { Lock } from 'lucide-react'

export default function ChatBubble({ message }) {
  const isOutbound = message.direction === 'outbound'
  const isNote = message.type === 'internal_note'

  if (isNote) {
    return (
      <div className="flex justify-center my-2">
        <div className="max-w-md w-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Lock size={12} className="text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Internal Note</span>
            {message.sender && (
              <span className="text-xs text-amber-600 dark:text-amber-500">• {message.sender.name}</span>
            )}
          </div>
          <p className="text-sm text-amber-900 dark:text-amber-200">{message.body}</p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 text-right">
            {message.createdAt ? format(new Date(message.createdAt), 'h:mm a') : ''}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-2 mb-3 ${isOutbound ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOutbound && (
        <Avatar name={message.contact?.name || 'Contact'} size="sm" className="shrink-0 mt-1" />
      )}
      <div className={`max-w-xs lg:max-w-md ${isOutbound ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isOutbound && message.contact?.name && (
          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">{message.contact.name}</span>
        )}
        <div className={`px-4 py-2.5 rounded-2xl text-sm ${
          isOutbound
            ? 'bg-brand-600 text-white rounded-tr-sm'
            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-tl-sm shadow-sm'
        }`}>
          {message.body}
          {message.media && (
            <div className="mt-2">
              {message.media.type === 'image' && (
                <img src={message.media.url} alt="media" className="rounded-lg max-w-xs" />
              )}
            </div>
          )}
        </div>
        <div className={`flex items-center gap-1 mt-1 ${isOutbound ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {message.createdAt ? format(new Date(message.createdAt), 'h:mm a') : ''}
          </span>
          {isOutbound && message.status && (
            <span className={`text-xs ${
              message.status === 'delivered' ? 'text-blue-400' :
              message.status === 'read' ? 'text-emerald-500' :
              'text-gray-400'
            }`}>
              {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
      {isOutbound && (
        <Avatar name={message.sender?.name || 'Agent'} src={message.sender?.avatar} size="sm" className="shrink-0 mt-1" />
      )}
    </div>
  )
}
