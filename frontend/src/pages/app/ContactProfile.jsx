import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsService } from '../../services/contacts.service.js'
import ActivityTimeline from '../../components/shared/ActivityTimeline.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import Tabs from '../../components/ui/Tabs.jsx'
import { PageSpinner } from '../../components/ui/Spinner.jsx'
import { useToast } from '../../hooks/useToast.js'
import { MessageSquare, Phone, Mail, ListChecks, ArrowLeft, Edit, Trash2, Plus, X } from 'lucide-react'
import { format } from 'date-fns'

const MOCK_CONTACT = {
  id: 'c1', name: 'Ahmed Al-Rashid', phone: '+971501234567', email: 'ahmed@example.com',
  leadStage: 'hot', leadScore: 85, leadValue: 12000, paymentStatus: 'active',
  tags: ['VIP', 'Upgrade'], assignee: { name: 'Sarah J.' }, notes: [
    { id: 'n1', note: 'Ready to upgrade. Mentioned budget approved.', createdAt: new Date().toISOString() },
    { id: 'n2', note: 'Spoke on call — very happy with service', createdAt: new Date(Date.now() - 86400000).toISOString() },
  ],
  timeline: [
    { id: 'e1', type: 'message', description: 'Sent message: "Hi, I want to upgrade to Pro plan"', createdAt: new Date(Date.now() - 1800000).toISOString() },
    { id: 'e2', type: 'note', description: 'Note added: Budget approved', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'e3', type: 'stage_change', description: 'Lead stage changed: warm → hot', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'e4', type: 'created', description: 'Contact created', createdAt: new Date(Date.now() - 604800000).toISOString() },
  ],
}

const stageColors = { new: 'info', hot: 'error', warm: 'warning', customer: 'success', lost: 'neutral' }

export default function ContactProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactsService.get(id),
    placeholderData: MOCK_CONTACT,
  })

  const addNoteMutation = useMutation({
    mutationFn: (note) => contactsService.addNote(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', id] })
      setNewNote('')
      setAddingNote(false)
      toast.success('Note added')
    },
    onError: () => toast.error('Failed to add note'),
  })

  if (isLoading && !contact) return <PageSpinner />

  const c = contact || MOCK_CONTACT

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'timeline', label: 'Timeline', count: c.timeline?.length },
    { key: 'conversations', label: 'Conversations' },
    { key: 'followups', label: 'Follow-ups' },
    { key: 'issues', label: 'Issues' },
    { key: 'notes', label: 'Notes', count: c.notes?.length },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <button onClick={() => navigate('/app/crm')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
        <ArrowLeft size={16} /> Back to CRM
      </button>

      {/* Header Card */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar name={c.name} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{c.name}</h1>
              <Badge variant={stageColors[c.leadStage] || 'neutral'} size="md" dot>{c.leadStage}</Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
              <span className="flex items-center gap-1"><Phone size={14} />{c.phone}</span>
              <span className="flex items-center gap-1"><Mail size={14} />{c.email}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {c.tags?.map(tag => (
                <span key={tag} className="text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="primary" size="sm" icon={MessageSquare}>Message</Button>
            <Button variant="outline" size="sm" icon={Phone}>Call</Button>
            <Button variant="outline" size="sm" icon={Mail}>Email</Button>
            <Button variant="outline" size="sm" icon={ListChecks}>Add Follow-up</Button>
            <Button variant="ghost" size="sm" icon={Edit}>Edit</Button>
          </div>
        </div>
      </Card>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Lead Stage', value: <Badge variant={stageColors[c.leadStage] || 'neutral'} dot>{c.leadStage}</Badge> },
          { label: 'Lead Score', value: <span className="text-xl font-bold text-gray-900 dark:text-white">{c.leadScore}</span> },
          { label: 'Lead Value', value: <span className="text-xl font-bold text-gray-900 dark:text-white">${(c.leadValue || 0).toLocaleString()}</span> },
          { label: 'Payment Status', value: <Badge variant={c.paymentStatus === 'active' ? 'success' : 'warning'} dot>{c.paymentStatus || 'N/A'}</Badge> },
        ].map(item => (
          <Card key={item.label}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
            {item.value}
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card header="Contact Details">
              <dl className="space-y-3 text-sm">
                {[
                  { label: 'Phone', value: c.phone },
                  { label: 'Email', value: c.email },
                  { label: 'Assignee', value: c.assignee?.name || 'Unassigned' },
                  { label: 'Lead Stage', value: c.leadStage },
                  { label: 'Lead Score', value: c.leadScore },
                ].map(field => (
                  <div key={field.label} className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">{field.label}</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">{field.value || '—'}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card header="Recent Timeline">
              <ActivityTimeline events={(c.timeline || []).slice(0, 4)} />
            </Card>
          </div>
        )}

        {activeTab === 'timeline' && (
          <Card>
            <ActivityTimeline events={c.timeline || []} />
          </Card>
        )}

        {activeTab === 'conversations' && (
          <Card>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              No conversations yet. <button className="text-brand-600 dark:text-brand-400 hover:underline">Start a conversation</button>
            </div>
          </Card>
        )}

        {activeTab === 'followups' && (
          <Card>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              No follow-ups scheduled. <button className="text-brand-600 dark:text-brand-400 hover:underline">Add follow-up</button>
            </div>
          </Card>
        )}

        {activeTab === 'issues' && (
          <Card>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">No issues found.</div>
          </Card>
        )}

        {activeTab === 'notes' && (
          <Card
            header={
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-gray-900 dark:text-white">Notes</span>
                <Button variant="primary" size="sm" icon={Plus} onClick={() => setAddingNote(true)}>Add Note</Button>
              </div>
            }
          >
            {addingNote && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Write a note..."
                  rows={3}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => addNoteMutation.mutate(newNote)} loading={addNoteMutation.isPending}>Save Note</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingNote(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {(c.notes || []).map(note => (
                <div key={note.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-700 dark:text-gray-200">{note.note}</p>
                  <p className="text-xs text-gray-400 mt-2">{note.createdAt ? format(new Date(note.createdAt), 'MMM d, yyyy h:mm a') : ''}</p>
                </div>
              ))}
              {(!c.notes || c.notes.length === 0) && !addingNote && (
                <p className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">No notes yet. Add the first one!</p>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
