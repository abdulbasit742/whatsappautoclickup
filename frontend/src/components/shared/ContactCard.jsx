import { useNavigate } from 'react-router-dom'
import Avatar from '../ui/Avatar.jsx'
import Badge from '../ui/Badge.jsx'
import { Phone, MessageSquare, Mail, UserPlus } from 'lucide-react'

const stageColors = {
  new: 'info',
  hot: 'error',
  warm: 'warning',
  cold: 'neutral',
  customer: 'success',
  lost: 'error',
}

export default function ContactCard({ contact, compact = false }) {
  const navigate = useNavigate()

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
      onClick={() => navigate(`/app/contacts/${contact.id}`)}
    >
      <Avatar name={contact.name} size={compact ? 'sm' : 'md'} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{contact.name}</span>
          {contact.leadStage && (
            <Badge variant={stageColors[contact.leadStage] || 'neutral'} size="sm">
              {contact.leadStage}
            </Badge>
          )}
        </div>
        {!compact && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{contact.phone || contact.email}</p>
        )}
      </div>
      {!compact && (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors" title="Message">
            <MessageSquare size={14} />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors" title="Call">
            <Phone size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
