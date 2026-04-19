import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { followupsService } from '../../services/followups.service.js'
import Table from '../../components/ui/Table.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import StatusChip from '../../components/ui/StatusChip.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import DatePicker from '../../components/ui/DatePicker.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import SearchInput from '../../components/ui/SearchInput.jsx'
import { useToast } from '../../hooks/useToast.js'
import { Plus, CheckCircle, Clock, AlertCircle, List, Calendar } from 'lucide-react'
import { format, isAfter, isBefore, isToday } from 'date-fns'

const MOCK_FOLLOWUPS = {
  data: [
    { id: 'f1', contact: { name: 'Ahmed Al-Rashid', id: 'c1' }, type: 'call', assignee: { name: 'Sarah J.' }, scheduledAt: new Date().toISOString(), status: 'pending', note: 'Discuss upgrade options' },
    { id: 'f2', contact: { name: 'Priya Sharma', id: 'c2' }, type: 'email', assignee: { name: 'Ali K.' }, scheduledAt: new Date(Date.now() - 3600000).toISOString(), status: 'pending', note: 'Send proposal' },
    { id: 'f3', contact: { name: 'John Mitchell', id: 'c3' }, type: 'message', assignee: { name: 'Sarah J.' }, scheduledAt: new Date(Date.now() - 86400000).toISOString(), status: 'completed', note: 'Check satisfaction' },
    { id: 'f4', contact: { name: 'Maria García', id: 'c4' }, type: 'call', assignee: null, scheduledAt: new Date(Date.now() + 86400000).toISOString(), status: 'pending', note: 'Initial discovery call' },
  ],
  total: 4,
}

export default function Followups() {
  const [view, setView] = useState('list')
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['followups', filter],
    queryFn: () => followupsService.list({ status: filter === 'all' ? undefined : filter }),
    placeholderData: MOCK_FOLLOWUPS,
  })

  const completeMutation = useMutation({
    mutationFn: (id) => followupsService.complete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['followups'] }); toast.success('Follow-up completed') },
    onError: () => toast.error('Failed to complete follow-up'),
  })

  const followups = data?.data || []
  const dueToday = followups.filter(f => isToday(new Date(f.scheduledAt)) && f.status !== 'completed').length
  const overdue = followups.filter(f => isBefore(new Date(f.scheduledAt), new Date()) && !isToday(new Date(f.scheduledAt)) && f.status !== 'completed').length
  const completed = followups.filter(f => f.status === 'completed').length

  const columns = [
    {
      key: 'contact', label: 'Contact',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.contact?.name} size="sm" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">{row.contact?.name}</span>
        </div>
      ),
    },
    { key: 'type', label: 'Type', render: (v) => <Badge variant="neutral" size="sm" className="capitalize">{v}</Badge> },
    {
      key: 'assignee', label: 'Assigned',
      render: (v) => v ? (
        <div className="flex items-center gap-1.5"><Avatar name={v.name} size="xs" /><span className="text-sm">{v.name}</span></div>
      ) : <span className="text-xs text-gray-400">Unassigned</span>,
    },
    {
      key: 'scheduledAt', label: 'Scheduled', sortable: true,
      render: (v, row) => {
        const date = new Date(v)
        const isOverdue = isBefore(date, new Date()) && row.status !== 'completed'
        const isTodays = isToday(date)
        return (
          <span className={`text-sm flex items-center gap-1 ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : isTodays ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
            <Clock size={12} />
            {format(date, 'MMM d, h:mm a')}
          </span>
        )
      },
    },
    {
      key: 'status', label: 'Status',
      render: (v) => <StatusChip status={v} size="sm" />,
    },
    { key: 'note', label: 'Note', render: (v) => <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs block">{v || '—'}</span> },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => row.status !== 'completed' ? (
        <Button variant="ghost" size="xs" icon={CheckCircle} onClick={() => completeMutation.mutate(row.id)} loading={completeMutation.isPending}>
          Complete
        </Button>
      ) : <span className="text-xs text-gray-400">Done</span>,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Follow-ups</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track and manage all follow-up tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-1">
            <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              <List size={16} />
            </button>
            <button onClick={() => setView('calendar')} className={`p-1.5 rounded-md transition-colors ${view === 'calendar' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              <Calendar size={16} />
            </button>
          </div>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>Add Follow-up</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Due Today', value: dueToday, color: 'amber' },
          { label: 'Overdue', value: overdue, color: 'red' },
          { label: 'Completed', value: completed, color: 'green' },
          { label: 'Total Pending', value: followups.filter(f => f.status === 'pending').length, color: 'blue' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search follow-ups..." className="max-w-sm flex-1" />
          <div className="flex gap-1">
            {['all', 'pending', 'completed'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded-full capitalize font-medium transition-colors ${filter === f ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>{f}</button>
            ))}
          </div>
        </div>
        <Table columns={columns} data={followups} loading={isLoading} emptyTitle="No follow-ups" emptyDescription="Create your first follow-up task" rowKey="id" />
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Follow-up" size="md"
        footer={<><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button variant="primary">Save</Button></>}
      >
        <div className="space-y-4">
          <Select label="Contact" options={[{ value: 'c1', label: 'Ahmed Al-Rashid' }, { value: 'c2', label: 'Priya Sharma' }]} value="" onChange={() => {}} placeholder="Search contact..." searchable />
          <Select label="Type" options={[{ value: 'call', label: 'Call' }, { value: 'email', label: 'Email' }, { value: 'message', label: 'Message' }, { value: 'meeting', label: 'Meeting' }]} value="" onChange={() => {}} placeholder="Select type..." />
          <DatePicker label="Scheduled At" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
            <textarea rows={3} placeholder="Add a note..." className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
