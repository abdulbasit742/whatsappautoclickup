import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { contactsService } from '../../services/contacts.service.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import Table from '../../components/ui/Table.jsx'
import SearchInput from '../../components/ui/SearchInput.jsx'
import Badge from '../../components/ui/Badge.jsx'
import StatusChip from '../../components/ui/StatusChip.jsx'
import Button from '../../components/ui/Button.jsx'
import Select from '../../components/ui/Select.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { usePagination } from '../../hooks/usePagination.js'
import { Upload, Download, Plus, Users, TrendingUp, Star, Flame } from 'lucide-react'
import { format } from 'date-fns'

const MOCK_CONTACTS = {
  data: [
    { id: 'c1', name: 'Ahmed Al-Rashid', phone: '+971501234567', email: 'ahmed@example.com', leadStage: 'hot', leadScore: 85, tags: ['VIP'], assignee: { name: 'Sarah J.' }, lastInteraction: new Date().toISOString(), followupDue: new Date(Date.now() + 86400000).toISOString() },
    { id: 'c2', name: 'Priya Sharma', phone: '+919876543210', email: 'priya@example.com', leadStage: 'warm', leadScore: 62, tags: ['New'], assignee: null, lastInteraction: new Date(Date.now() - 3600000).toISOString(), followupDue: null },
    { id: 'c3', name: 'John Mitchell', phone: '+14155551234', email: 'john@corp.com', leadStage: 'customer', leadScore: 95, tags: ['Enterprise'], assignee: { name: 'Ali K.' }, lastInteraction: new Date(Date.now() - 7200000).toISOString(), followupDue: null },
    { id: 'c4', name: 'Maria García', phone: '+34612345678', email: 'maria@startup.io', leadStage: 'new', leadScore: 40, tags: [], assignee: null, lastInteraction: new Date(Date.now() - 86400000).toISOString(), followupDue: new Date(Date.now() + 3600000).toISOString() },
    { id: 'c5', name: 'Wei Zhang', phone: '+8613812345678', email: 'wei@techco.cn', leadStage: 'warm', leadScore: 70, tags: ['Tech'], assignee: { name: 'Sarah J.' }, lastInteraction: new Date(Date.now() - 172800000).toISOString(), followupDue: null },
  ],
  total: 5,
}

const stageColors = { new: 'info', hot: 'error', warm: 'warning', cold: 'neutral', customer: 'success', lost: 'error' }

const LEAD_STAGES = [
  { value: 'new', label: 'New' },
  { value: 'warm', label: 'Warm' },
  { value: 'hot', label: 'Hot' },
  { value: 'customer', label: 'Customer' },
  { value: 'lost', label: 'Lost' },
]

export default function CRM() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { page, limit, nextPage, prevPage } = usePagination(1, 20)

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, limit, debouncedSearch, stageFilter],
    queryFn: () => contactsService.list({ page, limit, q: debouncedSearch, leadStage: stageFilter || undefined }),
    placeholderData: MOCK_CONTACTS,
  })

  const contacts = data?.data || []
  const total = data?.total || 0

  const stats = [
    { label: 'Total Contacts', value: total, icon: Users, color: 'blue' },
    { label: 'Hot Leads', value: contacts.filter(c => c.leadStage === 'hot').length, icon: Flame, color: 'red' },
    { label: 'Warm Leads', value: contacts.filter(c => c.leadStage === 'warm').length, icon: TrendingUp, color: 'orange' },
    { label: 'Customers', value: contacts.filter(c => c.leadStage === 'customer').length, icon: Star, color: 'green' },
  ]

  const columns = [
    {
      key: 'name', label: 'Name', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{row.phone}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', label: 'Email', render: (v) => <span className="text-sm text-gray-600 dark:text-gray-300">{v}</span> },
    {
      key: 'leadStage', label: 'Stage', sortable: true,
      render: (v) => <Badge variant={stageColors[v] || 'neutral'} size="sm" dot>{v}</Badge>,
    },
    {
      key: 'leadScore', label: 'Score', sortable: true,
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${v}%` }} />
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{v}</span>
        </div>
      ),
    },
    {
      key: 'tags', label: 'Tags',
      render: (v) => (
        <div className="flex flex-wrap gap-1">
          {(v || []).map(t => (
            <span key={t} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      ),
    },
    {
      key: 'assignee', label: 'Assigned',
      render: (v) => v ? (
        <div className="flex items-center gap-1.5">
          <Avatar name={v.name} size="xs" />
          <span className="text-sm text-gray-600 dark:text-gray-300">{v.name}</span>
        </div>
      ) : <span className="text-xs text-gray-400">Unassigned</span>,
    },
    {
      key: 'lastInteraction', label: 'Last Interaction', sortable: true,
      render: (v) => <span className="text-sm text-gray-500 dark:text-gray-400">{v ? format(new Date(v), 'MMM d, h:mm a') : '—'}</span>,
    },
    {
      key: 'followupDue', label: 'Follow-up',
      render: (v) => v ? (
        <span className={`text-sm ${new Date(v) < new Date() ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          {format(new Date(v), 'MMM d')}
        </span>
      ) : <span className="text-gray-400 text-sm">—</span>,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your contacts and leads</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" icon={Upload}>Import CSV</Button>
          <Button variant="outline" size="sm" icon={Download}>Export</Button>
          <Button variant="primary" size="sm" icon={Plus}>Add Contact</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search contacts..." className="flex-1 min-w-48 max-w-sm" />
          <Select
            options={[{ value: '', label: 'All Stages' }, ...LEAD_STAGES]}
            value={stageFilter}
            onChange={setStageFilter}
            className="w-40"
          />
        </div>

        <Table
          columns={columns}
          data={contacts}
          loading={isLoading}
          onRowClick={row => navigate(`/app/contacts/${row.id}`)}
          emptyTitle="No contacts found"
          emptyDescription="Add your first contact or import from CSV"
          rowKey="id"
          pagination={{
            page, limit, total,
            onNext: nextPage, onPrev: prevPage,
          }}
        />
      </div>
    </div>
  )
}
