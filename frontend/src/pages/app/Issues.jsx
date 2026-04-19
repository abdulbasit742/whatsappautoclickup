import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { issuesService } from '../../services/issues.service.js'
import Table from '../../components/ui/Table.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import StatusChip from '../../components/ui/StatusChip.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import SearchInput from '../../components/ui/SearchInput.jsx'
import Drawer from '../../components/ui/Drawer.jsx'
import { useToast } from '../../hooks/useToast.js'
import { Plus, AlertCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

const MOCK_ISSUES = {
  data: [
    { id: 'i1', title: 'WhatsApp messages not delivering', contact: { name: 'Ahmed Al-Rashid' }, severity: 'critical', status: 'open', sla: '2h', assignee: { name: 'Ali K.' }, createdAt: new Date().toISOString() },
    { id: 'i2', title: 'Login issue — 2FA not working', contact: { name: 'Priya Sharma' }, severity: 'high', status: 'open', sla: '4h', assignee: null, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'i3', title: 'Campaign not launching', contact: { name: 'John Mitchell' }, severity: 'medium', status: 'resolved', sla: '24h', assignee: { name: 'Sarah J.' }, createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'i4', title: 'Wrong contact imported', contact: { name: 'Maria García' }, severity: 'low', status: 'open', sla: '48h', assignee: null, createdAt: new Date(Date.now() - 172800000).toISOString() },
  ],
  total: 4,
}

const severityColors = { critical: 'error', high: 'warning', medium: 'info', low: 'neutral' }

export default function Issues() {
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [severityFilter, setSeverityFilter] = useState('')
  const [search, setSearch] = useState('')
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['issues', severityFilter],
    queryFn: () => issuesService.list({ severity: severityFilter || undefined }),
    placeholderData: MOCK_ISSUES,
  })

  const resolveMutation = useMutation({
    mutationFn: (id) => issuesService.resolve(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['issues'] }); toast.success('Issue resolved') },
  })

  const issues = (data?.data || []).filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()))

  const stats = [
    { label: 'Open', value: issues.filter(i => i.status === 'open').length },
    { label: 'Critical', value: issues.filter(i => i.severity === 'critical').length },
    { label: 'High', value: issues.filter(i => i.severity === 'high').length },
    { label: 'Resolved Today', value: issues.filter(i => i.status === 'resolved').length },
  ]

  const columns = [
    { key: 'id', label: '#', render: (v) => <span className="text-xs text-gray-400 font-mono">{v}</span>, width: '60px' },
    {
      key: 'title', label: 'Title',
      render: (v, row) => (
        <div>
          <p className="font-medium text-sm text-gray-900 dark:text-white">{v}</p>
          <p className="text-xs text-gray-400">{row.contact?.name}</p>
        </div>
      ),
    },
    { key: 'severity', label: 'Severity', render: (v) => <Badge variant={severityColors[v] || 'neutral'} size="sm" dot className="capitalize">{v}</Badge> },
    { key: 'status', label: 'Status', render: (v) => <StatusChip status={v} size="sm" /> },
    { key: 'sla', label: 'SLA', render: (v) => <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1"><Clock size={10} />{v}</span> },
    {
      key: 'assignee', label: 'Assignee',
      render: (v) => v ? <div className="flex items-center gap-1.5"><Avatar name={v.name} size="xs" /><span className="text-sm">{v.name}</span></div> : <span className="text-xs text-gray-400">Unassigned</span>,
    },
    { key: 'createdAt', label: 'Created', sortable: true, render: (v) => <span className="text-sm text-gray-500">{format(new Date(v), 'MMM d')}</span> },
    {
      key: 'actions', label: '', width: '120px',
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {row.status !== 'resolved' && (
            <Button variant="ghost" size="xs" onClick={() => resolveMutation.mutate(row.id)} loading={resolveMutation.isPending}>Resolve</Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Issues</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track and resolve customer support issues</p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>Create Issue</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search issues..." className="flex-1 max-w-sm" />
          <Select
            options={[{ value: '', label: 'All Severities' }, { value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]}
            value={severityFilter}
            onChange={setSeverityFilter}
            className="w-40"
          />
        </div>
        <Table columns={columns} data={issues} loading={isLoading} onRowClick={setSelectedIssue} emptyTitle="No issues found" rowKey="id" />
      </div>

      {/* Issue Detail Drawer */}
      <Drawer open={!!selectedIssue} onClose={() => setSelectedIssue(null)} title="Issue Details" width="md">
        {selectedIssue && (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedIssue.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={severityColors[selectedIssue.severity] || 'neutral'} dot className="capitalize">{selectedIssue.severity}</Badge>
                <StatusChip status={selectedIssue.status} />
              </div>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Contact</dt><dd className="font-medium text-gray-900 dark:text-white">{selectedIssue.contact?.name}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">SLA</dt><dd className="font-medium text-amber-600">{selectedIssue.sla}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Assignee</dt><dd className="font-medium text-gray-900 dark:text-white">{selectedIssue.assignee?.name || 'Unassigned'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Created</dt><dd className="font-medium text-gray-900 dark:text-white">{format(new Date(selectedIssue.createdAt), 'MMM d, h:mm a')}</dd></div>
            </dl>
            {selectedIssue.status !== 'resolved' && (
              <Button variant="primary" className="w-full" onClick={() => { resolveMutation.mutate(selectedIssue.id); setSelectedIssue(null) }}>
                Mark as Resolved
              </Button>
            )}
          </div>
        )}
      </Drawer>

      {/* Create Issue Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Issue" size="md"
        footer={<><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button variant="primary">Create Issue</Button></>}
      >
        <div className="space-y-4">
          <Input label="Title" placeholder="Describe the issue..." />
          <Select label="Contact" options={[{ value: 'c1', label: 'Ahmed Al-Rashid' }, { value: 'c2', label: 'Priya Sharma' }]} value="" onChange={() => {}} placeholder="Search contact..." searchable />
          <Select label="Severity" options={[{ value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} value="" onChange={() => {}} placeholder="Select severity..." />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea rows={4} placeholder="Describe the issue in detail..." className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
