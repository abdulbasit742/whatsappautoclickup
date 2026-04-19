import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { campaignsService } from '../../services/campaigns.service.js'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import StatusChip from '../../components/ui/StatusChip.jsx'
import SearchInput from '../../components/ui/SearchInput.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import { useToast } from '../../hooks/useToast.js'
import { Plus, Play, Pause, BarChart3, Users, Send, CheckCircle, FileEdit, Clock } from 'lucide-react'
import { format } from 'date-fns'

const MOCK_CAMPAIGNS = {
  data: [
    { id: 'cp1', name: 'Q3 Flash Sale Promo', status: 'running', audience: 2400, sent: 2100, delivered: 1998, rate: 95.1, schedule: new Date().toISOString(), template: 'Flash Sale' },
    { id: 'cp2', name: 'Win-back Campaign', status: 'completed', audience: 1800, sent: 1800, delivered: 1710, rate: 95.0, schedule: new Date(Date.now() - 86400000).toISOString(), template: 'Win-back' },
    { id: 'cp3', name: 'Product Launch Announcement', status: 'draft', audience: 5000, sent: 0, delivered: 0, rate: 0, schedule: new Date(Date.now() + 86400000).toISOString(), template: 'Product Launch' },
    { id: 'cp4', name: 'Monthly Newsletter', status: 'scheduled', audience: 12000, sent: 0, delivered: 0, rate: 0, schedule: new Date(Date.now() + 604800000).toISOString(), template: 'Newsletter' },
  ],
  total: 4,
}

const statusColors = { running: 'success', completed: 'brand', draft: 'neutral', scheduled: 'purple', paused: 'warning', failed: 'error' }

export default function Campaigns() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newCampaign, setNewCampaign] = useState({ name: '', template: '', schedule: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', filter],
    queryFn: () => campaignsService.list({ status: filter === 'all' ? undefined : filter }),
    placeholderData: MOCK_CAMPAIGNS,
  })

  const createMutation = useMutation({
    mutationFn: (data) => campaignsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      setCreateOpen(false)
      toast.success('Campaign created')
    },
    onError: () => toast.error('Failed to create campaign'),
  })

  const campaigns = (data?.data || []).filter(c => search ? c.name.toLowerCase().includes(search.toLowerCase()) : true)

  const stats = [
    { label: 'Total', value: data?.total || 0, color: 'gray' },
    { label: 'Running', value: (data?.data || []).filter(c => c.status === 'running').length, color: 'green' },
    { label: 'Completed', value: (data?.data || []).filter(c => c.status === 'completed').length, color: 'blue' },
    { label: 'Draft', value: (data?.data || []).filter(c => c.status === 'draft').length, color: 'gray' },
  ]

  const filters = ['all', 'running', 'completed', 'scheduled', 'draft', 'paused']

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Create and manage broadcast campaigns</p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>New Campaign</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search campaigns..." className="flex-1 min-w-48 max-w-sm" />
          <div className="flex gap-1 flex-wrap">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-full font-medium capitalize transition-colors ${filter === f ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                {['Name', 'Status', 'Audience', 'Sent', 'Delivered', 'Rate', 'Schedule', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                [1,2,3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-gray-500">No campaigns found</td>
                </tr>
              ) : campaigns.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors" onClick={() => navigate(`/app/campaigns/${c.id}`)}>
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.template}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4"><StatusChip status={c.status} size="sm" /></td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300"><span className="flex items-center gap-1"><Users size={12} />{c.audience?.toLocaleString()}</span></td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{c.sent?.toLocaleString()}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{c.delivered?.toLocaleString()}</td>
                  <td className="px-4 py-4">
                    <span className={`text-sm font-medium ${c.rate >= 90 ? 'text-emerald-600 dark:text-emerald-400' : c.rate >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                      {c.rate > 0 ? `${c.rate}%` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Clock size={12} />{format(new Date(c.schedule), 'MMM d, h:mm a')}</span>
                  </td>
                  <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {c.status === 'running' && (
                        <button className="p-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 transition-colors"><Pause size={14} /></button>
                      )}
                      {(c.status === 'draft' || c.status === 'paused') && (
                        <button className="p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors"><Play size={14} /></button>
                      )}
                      <button className="p-1.5 rounded hover:bg-brand-50 dark:hover:bg-brand-900/20 text-brand-500 transition-colors"><BarChart3 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Campaign Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Campaign"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => createMutation.mutate(newCampaign)} loading={createMutation.isPending}>Create Campaign</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Campaign Name" value={newCampaign.name} onChange={e => setNewCampaign(n => ({ ...n, name: e.target.value }))} placeholder="e.g. Summer Sale Promo" />
          <Select
            label="Template"
            options={[
              { value: 'promotional', label: 'Promotional' },
              { value: 'newsletter', label: 'Newsletter' },
              { value: 'announcement', label: 'Announcement' },
            ]}
            value={newCampaign.template}
            onChange={v => setNewCampaign(n => ({ ...n, template: v }))}
            placeholder="Select template..."
          />
          <Input label="Schedule" type="datetime-local" value={newCampaign.schedule} onChange={e => setNewCampaign(n => ({ ...n, schedule: e.target.value }))} />
        </div>
      </Modal>
    </div>
  )
}
