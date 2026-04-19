import { useState } from 'react'
import Table from '../../components/ui/Table.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Input from '../../components/ui/Input.jsx'
import ProgressBar from '../../components/ui/ProgressBar.jsx'
import { Plus } from 'lucide-react'

const MOCK_FLAGS = [
  { id: 'f1', key: 'ai_reply_suggestions', desc: 'AI reply suggestions in inbox', enabled: true, plan: 'pro', rollout: 100 },
  { id: 'f2', key: 'advanced_analytics', desc: 'Advanced analytics dashboard', enabled: true, plan: 'pro', rollout: 100 },
  { id: 'f3', key: 'bulk_campaigns', desc: 'Bulk campaign broadcasting', enabled: true, plan: 'starter', rollout: 100 },
  { id: 'f4', key: 'ai_lead_scoring', desc: 'Automated AI lead scoring', enabled: false, plan: 'pro', rollout: 0 },
  { id: 'f5', key: 'whitelabel', desc: 'White-label branding option', enabled: false, plan: 'enterprise', rollout: 0 },
]

export default function FeatureFlags() {
  const [flags, setFlags] = useState(MOCK_FLAGS)
  const [createOpen, setCreateOpen] = useState(false)
  const toggle = (id) => setFlags(fs => fs.map(f => f.id === id ? {...f, enabled: !f.enabled} : f))
  const columns = [
    { key: 'key', label: 'Flag Key', render: v => <span className="font-mono text-sm text-brand-600 dark:text-brand-400">{v}</span> },
    { key: 'desc', label: 'Description', render: v => <span className="text-sm text-gray-600 dark:text-gray-300">{v}</span> },
    { key: 'plan', label: 'Plan Required', render: v => <Badge variant={v==='enterprise'?'orange':v==='pro'?'purple':'brand'} size="sm" className="capitalize">{v}</Badge> },
    { key: 'rollout', label: 'Rollout', render: v => <div className="flex items-center gap-2 w-24"><ProgressBar value={v} max={100} size="sm" color="brand" /><span className="text-xs text-gray-500">{v}%</span></div> },
    { key: 'enabled', label: 'Status', render: (v, r) => (
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={v} onChange={() => toggle(r.id)} className="sr-only peer" />
        <div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600" />
      </label>
    )},
  ]
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feature Flags</h1><p className="text-sm text-gray-500 mt-0.5">Control feature rollouts and access</p></div>
        <Button variant="primary" size="sm" icon={Plus} onClick={()=>setCreateOpen(true)}>New Flag</Button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <Table columns={columns} data={flags} emptyTitle="No feature flags" rowKey="id" />
      </div>
      <Modal open={createOpen} onClose={()=>setCreateOpen(false)} title="Create Feature Flag" size="sm"
        footer={<><Button variant="outline" onClick={()=>setCreateOpen(false)}>Cancel</Button><Button variant="primary">Create</Button></>}>
        <div className="space-y-4"><Input label="Flag Key" placeholder="e.g. new_feature_name" /><Input label="Description" placeholder="What does this flag control?" /><Input label="Rollout %" type="number" defaultValue="0" /></div>
      </Modal>
    </div>
  )
}
