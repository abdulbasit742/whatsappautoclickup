import { useState } from 'react'
import Table from '../../components/ui/Table.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import ConfirmModal from '../../components/ui/ConfirmModal.jsx'
import { Plus, Eye, EyeOff, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'

const MOCK_KEYS = [
  { id: 'k1', provider: 'Groq', key: 'gsk_...a4f8', status: 'active', lastUsed: new Date().toISOString() },
  { id: 'k2', provider: 'OpenAI', key: 'sk-...b9c2', status: 'active', lastUsed: new Date(Date.now()-86400000).toISOString() },
  { id: 'k3', provider: 'Stripe', key: 'sk_live_...d3e1', status: 'inactive', lastUsed: null },
]

export default function APIKeys() {
  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [showKey, setShowKey] = useState({})
  const columns = [
    { key: 'provider', label: 'Provider', render: v => <span className="font-medium text-sm text-gray-900 dark:text-white">{v}</span> },
    { key: 'key', label: 'Key', render: (v, r) => <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{showKey[r.id] ? v : v.replace(/./g, '•').slice(0,12)+'...'}</span> },
    { key: 'status', label: 'Status', render: v => <Badge variant={v==='active'?'success':'neutral'} size="sm" dot>{v}</Badge> },
    { key: 'lastUsed', label: 'Last Used', render: v => <span className="text-sm text-gray-500">{v ? format(new Date(v),'MMM d, h:mm a') : 'Never'}</span> },
    { key: 'actions', label: '', render: (_, r) => <div className="flex gap-1"><button onClick={()=>setShowKey(p=>({...p,[r.id]:!p[r.id]}))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">{showKey[r.id]?<EyeOff size={14}/>:<Eye size={14}/>}</button><Button variant="ghost" size="xs">Test</Button><button onClick={()=>setDeleteId(r.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"><Trash2 size={14}/></button></div> },
  ]
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Keys</h1><p className="text-sm text-gray-500 mt-0.5">Manage provider API keys</p></div>
        <Button variant="primary" size="sm" icon={Plus} onClick={()=>setAddOpen(true)}>Add Key</Button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <Table columns={columns} data={MOCK_KEYS} emptyTitle="No API keys" rowKey="id" />
      </div>
      <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Add API Key" size="sm"
        footer={<><Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button><Button variant="primary">Add Key</Button></>}>
        <div className="space-y-4">
          <Select label="Provider" options={[{value:'groq',label:'Groq'},{value:'openai',label:'OpenAI'},{value:'claude',label:'Anthropic Claude'},{value:'gemini',label:'Google Gemini'},{value:'stripe',label:'Stripe'}]} value="" onChange={()=>{}} placeholder="Select provider..."/>
          <Input label="API Key" type="password" placeholder="Paste your API key..." />
        </div>
      </Modal>
      <ConfirmModal open={!!deleteId} onClose={()=>setDeleteId(null)} onConfirm={()=>setDeleteId(null)} title="Delete API Key" message="This will permanently delete this API key and may break integrations." />
    </div>
  )
}
