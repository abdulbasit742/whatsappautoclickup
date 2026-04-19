import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { conversationsService } from '../../services/conversations.service.js'
import { useSocket } from '../../hooks/useSocket.js'
import { useToast } from '../../hooks/useToast.js'
import ChatBubble from '../../components/shared/ChatBubble.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Badge from '../../components/ui/Badge.jsx'
import StatusChip from '../../components/ui/StatusChip.jsx'
import SearchInput from '../../components/ui/SearchInput.jsx'
import { PageSpinner } from '../../components/ui/Spinner.jsx'
import { useDebounce } from '../../hooks/useDebounce.js'
import {
  Send, Paperclip, FileText, ChevronRight, MoreVertical, User,
  Star, Tag, Phone, Mail, MessageSquare, AlertCircle, ListChecks,
  Smile, Lock, X, ChevronDown, RefreshCw, Bot, Brain, Circle
} from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

const MOCK_CONVERSATIONS = {
  data: [
    { id: '1', contact: { id: 'c1', name: 'Ahmed Al-Rashid', phone: '+971501234567', email: 'ahmed@example.com', leadStage: 'hot', leadScore: 85 }, lastMessage: 'Hi, I want to upgrade to Pro plan', lastAt: new Date().toISOString(), unreadCount: 2, status: 'open', assignee: { name: 'Sarah J.' }, tags: ['VIP', 'Upgrade'] },
    { id: '2', contact: { id: 'c2', name: 'Priya Sharma', phone: '+919876543210', email: 'priya@example.com', leadStage: 'warm', leadScore: 62 }, lastMessage: 'Can you send me the brochure?', lastAt: new Date(Date.now() - 3600000).toISOString(), unreadCount: 0, status: 'open', assignee: null, tags: ['New'] },
    { id: '3', contact: { id: 'c3', name: 'John Mitchell', phone: '+14155551234', email: 'john@corp.com', leadStage: 'customer', leadScore: 95 }, lastMessage: 'Thanks for the quick response!', lastAt: new Date(Date.now() - 7200000).toISOString(), unreadCount: 0, status: 'open', assignee: { name: 'Ali K.' }, tags: ['Enterprise'] },
    { id: '4', contact: { id: 'c4', name: 'Maria García', phone: '+34612345678', email: 'maria@startup.io', leadStage: 'new', leadScore: 40 }, lastMessage: 'Hello, I have a question about pricing', lastAt: new Date(Date.now() - 86400000).toISOString(), unreadCount: 1, status: 'open', assignee: null, tags: [] },
  ],
  total: 4,
}

const MOCK_MESSAGES = {
  data: [
    { id: 'm1', body: 'Hello! I saw your platform on Product Hunt. Very impressive!', direction: 'inbound', createdAt: new Date(Date.now() - 7200000).toISOString(), status: 'read', contact: { name: 'Ahmed Al-Rashid' } },
    { id: 'm2', body: 'Thank you Ahmed! We\'re glad you found us. How can we help you today?', direction: 'outbound', createdAt: new Date(Date.now() - 7100000).toISOString(), status: 'read', sender: { name: 'Sarah J.' } },
    { id: 'm3', body: 'I want to upgrade to Pro plan. Our team has grown to 8 people and we need more seats.', direction: 'inbound', createdAt: new Date(Date.now() - 3600000).toISOString(), status: 'read', contact: { name: 'Ahmed Al-Rashid' } },
    { id: 'm4', body: 'Hi, I want to upgrade to Pro plan', direction: 'inbound', createdAt: new Date(Date.now() - 1800000).toISOString(), status: 'read', contact: { name: 'Ahmed Al-Rashid' } },
  ],
}

const MOCK_CONTACT = { id: 'c1', name: 'Ahmed Al-Rashid', phone: '+971501234567', email: 'ahmed@example.com', leadStage: 'hot', leadScore: 85, sentiment: 'positive', assignee: { name: 'Sarah J.' }, paymentStatus: 'active', openIssues: 0, followupDue: new Date(Date.now() + 86400000).toISOString(), aiSummary: 'High-intent customer looking to upgrade. Very responsive and positive tone. Ready to close.', recommendedAction: 'Send upgrade offer with 10% discount code', tags: ['VIP', 'Upgrade'] }

export default function Inbox() {
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [noteMode, setNoteMode] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const messagesEndRef = useRef(null)
  const debouncedSearch = useDebounce(search, 300)
  const { on } = useSocket()
  const toast = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: convData, isLoading } = useQuery({
    queryKey: ['conversations', filter, debouncedSearch],
    queryFn: () => conversationsService.list({ status: filter === 'all' ? undefined : filter, q: debouncedSearch }),
    placeholderData: MOCK_CONVERSATIONS,
  })

  const { data: messagesData } = useQuery({
    queryKey: ['messages', selectedId],
    queryFn: () => conversationsService.messages(selectedId),
    enabled: !!selectedId,
    placeholderData: MOCK_MESSAGES,
  })

  const sendMutation = useMutation({
    mutationFn: ({ id, body, type }) => conversationsService.sendMessage(id, { body, type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] })
      setMessage('')
    },
    onError: () => toast.error('Failed to send message'),
  })

  useEffect(() => {
    const cleanup = on('new_message', (msg) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      if (msg.conversationId === selectedId) {
        queryClient.invalidateQueries({ queryKey: ['messages', selectedId] })
      }
    })
    return cleanup
  }, [selectedId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesData?.data])

  const conversations = convData?.data || []
  const messages = messagesData?.data || []
  const selectedConv = conversations.find(c => c.id === selectedId)

  const handleSend = () => {
    if (!message.trim() || !selectedId) return
    sendMutation.mutate({ id: selectedId, body: message.trim(), type: noteMode ? 'internal_note' : 'text' })
  }

  const filterTabs = [
    { key: 'all', label: 'All', count: conversations.length },
    { key: 'unread', label: 'Unread', count: conversations.filter(c => c.unreadCount > 0).length },
    { key: 'open', label: 'Open' },
    { key: 'archived', label: 'Archived' },
  ]

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* LEFT: Conversation list */}
      <div className="w-72 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <SearchInput value={search} onChange={setSearch} placeholder="Search conversations..." className="mb-3" />
          <div className="flex gap-1 overflow-x-auto">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${filter === tab.key ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                {tab.label}
                {tab.count !== undefined && <span className={`text-xs ${filter === tab.key ? 'text-brand-200' : 'text-gray-400'}`}>{tab.count}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">No conversations found</div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700/50 ${selectedId === conv.id ? 'bg-brand-50 dark:bg-brand-900/20 border-l-2 border-l-brand-500' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={conv.contact.name} size="sm" status={conv.status === 'open' ? 'online' : undefined} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm font-medium truncate ${conv.unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                        {conv.contact.name}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0 ml-1">
                        {format(new Date(conv.lastAt), 'h:mm a')}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                      {conv.lastMessage}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {conv.tags?.map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full">{tag}</span>
                      ))}
                      {conv.unreadCount > 0 && (
                        <span className="ml-auto shrink-0 w-5 h-5 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* CENTER: Conversation */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={28} className="text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Select a conversation</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Choose from the list to start messaging</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-3 shrink-0">
              <Avatar name={selectedConv?.contact.name} size="sm" status="online" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{selectedConv?.contact.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedConv?.contact.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusChip status={selectedConv?.status || 'open'} size="sm" />
                {selectedConv?.assignee && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">Assigned: {selectedConv.assignee.name}</span>
                )}
                <button
                  onClick={() => setRightPanelOpen(!rightPanelOpen)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                  title={rightPanelOpen ? 'Hide panel' : 'Show panel'}
                >
                  <ChevronRight size={18} className={`transition-transform ${rightPanelOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
              {noteMode && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Lock size={12} className="text-amber-500" />
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Internal Note Mode</span>
                  <button onClick={() => setNoteMode(false)} className="ml-auto text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                    }}
                    placeholder={noteMode ? 'Add internal note...' : 'Type a message...'}
                    rows={1}
                    className={`w-full px-4 py-2.5 text-sm rounded-xl border resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors max-h-32 ${noteMode ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700' : 'bg-gray-100 dark:bg-gray-700 border-transparent dark:text-gray-100'}`}
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setNoteMode(!noteMode)} title="Internal note" className={`p-2 rounded-lg transition-colors ${noteMode ? 'bg-amber-100 text-amber-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'}`}>
                    <Lock size={16} />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors" title="Attach file">
                    <Paperclip size={16} />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors" title="Templates">
                    <FileText size={16} />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || sendMutation.isPending}
                    className="p-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* RIGHT: Client intelligence panel */}
      {selectedId && rightPanelOpen && (
        <div className="w-72 shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={MOCK_CONTACT.name} size="md" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{MOCK_CONTACT.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{MOCK_CONTACT.phone}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {MOCK_CONTACT.tags.map(tag => (
                <span key={tag} className="text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Lead info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Lead Stage</p>
                <Badge variant="error" size="sm" dot>{MOCK_CONTACT.leadStage}</Badge>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Lead Score</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{MOCK_CONTACT.leadScore}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Sentiment</p>
                <Badge variant="success" size="sm" dot>{MOCK_CONTACT.sentiment}</Badge>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Issues</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{MOCK_CONTACT.openIssues}</p>
              </div>
            </div>

            {/* AI Summary */}
            <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3 border border-brand-200 dark:border-brand-800">
              <div className="flex items-center gap-2 mb-2">
                <Brain size={14} className="text-brand-600 dark:text-brand-400" />
                <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">AI Summary</span>
              </div>
              <p className="text-xs text-brand-800 dark:text-brand-200 leading-relaxed">{MOCK_CONTACT.aiSummary}</p>
            </div>

            {/* Recommended Action */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <Bot size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Recommended Action</span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-200">{MOCK_CONTACT.recommendedAction}</p>
            </div>

            {/* Follow-up */}
            {MOCK_CONTACT.followupDue && (
              <div className="flex items-center gap-2 text-sm">
                <ListChecks size={14} className="text-orange-500 shrink-0" />
                <span className="text-gray-600 dark:text-gray-300 text-xs">
                  Follow-up due {format(new Date(MOCK_CONTACT.followupDue), 'MMM d, h:mm a')}
                </span>
              </div>
            )}

            {/* Quick actions */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => navigate(`/app/contacts/${MOCK_CONTACT.id}`)} className="flex items-center gap-2 p-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-700 dark:text-gray-200">
                  <User size={12} /> View Profile
                </button>
                <button className="flex items-center gap-2 p-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-700 dark:text-gray-200">
                  <ListChecks size={12} /> Add Follow-up
                </button>
                <button className="flex items-center gap-2 p-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-700 dark:text-gray-200">
                  <AlertCircle size={12} /> Create Issue
                </button>
                <button className="flex items-center gap-2 p-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-700 dark:text-gray-200">
                  <Tag size={12} /> Add Tag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
