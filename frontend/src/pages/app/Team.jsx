import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usersService } from '../../services/users.service.js'
import Table from '../../components/ui/Table.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { UserPlus, Users } from 'lucide-react'
import { format } from 'date-fns'

const MOCK = { data: [
  { id: 'u1', name: 'Sarah Johnson', email: 'sarah@co.com', role: 'admin', status: 'active', lastActive: new Date().toISOString() },
  { id: 'u2', name: 'Ali Khan', email: 'ali@co.com', role: 'agent', status: 'active', lastActive: new Date(Date.now()-3600000).toISOString() },
  { id: 'u3', name: 'Maria Lee', email: 'maria@co.com', role: 'agent', status: 'pending', lastActive: null },
  { id: 'u4', name: 'Tom Wilson', email: 'tom@co.com', role: 'viewer', status: 'suspended', lastActive: new Date(Date.now()-86400000*3).toISOString() },
], total: 4 }

const ROLE_COLORS = { admin: 'purple', agent: 'brand', viewer: 'neutral', owner: 'error' }

export default function Team() {
  const [inviteOpen, setInviteOpen] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => usersService.list(), placeholderData: MOCK })
  const members = data?.data || []
  const columns = [
    { key: 'name', label: 'Member', render: (_, r) => <div className="flex items-center gap-3"><Avatar name={r.name} size="sm" status={r.status==='active'?'online':undefined}/><div><p className="font-medium text-sm text-gray-900 dark:text-white">{r.name}</p><p className="text-xs text-gray-500">{r.email}</p></div></div> },
    { key: 'role', label: 'Role', render: v => <Badge variant={ROLE_COLORS[v]||'neutral'} size="sm" className="capitalize">{v}</Badge> },
    { key: 'status', label: 'Status', render: v => <Badge variant={v==='active'?'success':v==='pending'?'warning':'error'} size="sm" dot className="capitalize">{v}</Badge> },
    { key: 'lastActive', label: 'Last Active', render: v => <span className="text-sm text-gray-500">{v ? format(new Date(v),'MMM d, h:mm a') : 'Never'}</span> },
    { key: 'actions', label: '', render: (_, r) => <div className="flex gap-2"><Button variant="ghost" size="xs">Edit</Button>{r.status!=='suspended'?<Button variant="ghost" size="xs">Suspend</Button>:<Button variant="ghost" size="xs">Unsuspend</Button>}</div> },
  ]
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team</h1><p className="text-sm text-gray-500 mt-0.5">Manage team members and roles</p></div>
        <Button variant="primary" size="sm" icon={UserPlus} onClick={() => setInviteOpen(true)}>Invite Member</Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{l:'Total Seats',v:members.length},{l:'Active',v:members.filter(m=>m.status==='active').length},{l:'Pending Invites',v:members.filter(m=>m.status==='pending').length}].map(s=>(
          <div key={s.l} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"><p className="text-2xl font-bold text-gray-900 dark:text-white">{s.v}</p><p className="text-sm text-gray-500">{s.l}</p></div>
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <Table columns={columns} data={members} loading={isLoading} emptyTitle="No team members" rowKey="id" />
      </div>
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Team Member" size="sm"
        footer={<><Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button><Button variant="primary">Send Invite</Button></>}>
        <div className="space-y-4">
          <Input label="Email Address" type="email" placeholder="colleague@company.com" />
          <Select label="Role" options={[{value:'admin',label:'Admin'},{value:'agent',label:'Agent'},{value:'viewer',label:'Viewer'}]} value="" onChange={()=>{}} placeholder="Select role..." />
        </div>
      </Modal>
    </div>
  )
}
