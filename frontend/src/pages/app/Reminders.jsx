import { useState } from 'react'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Modal from '../../components/ui/Modal.jsx'
import DatePicker from '../../components/ui/DatePicker.jsx'
import Select from '../../components/ui/Select.jsx'
import Input from '../../components/ui/Input.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import SearchInput from '../../components/ui/SearchInput.jsx'
import { Plus, Clock, Bell, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

const MOCK_REMINDERS = [
  { id: 'r1', title: 'Call Ahmed about upgrade', contact: { name: 'Ahmed Al-Rashid' }, dueAt: new Date().toISOString(), priority: 'high', status: 'pending' },
  { id: 'r2', title: 'Send proposal to Priya', contact: { name: 'Priya Sharma' }, dueAt: new Date(Date.now() + 3600000).toISOString(), priority: 'medium', status: 'pending' },
  { id: 'r3', title: 'Follow up on invoice #142', contact: { name: 'John Mitchell' }, dueAt: new Date(Date.now() - 3600000).toISOString(), priority: 'high', status: 'pending' },
  { id: 'r4', title: 'Quarterly review call', contact: { name: 'Wei Zhang' }, dueAt: new Date(Date.now() + 86400000).toISOString(), priority: 'low', status: 'done' },
]

const priorityColors = { high: 'error', medium: 'warning', low: 'neutral' }

export default function Reminders() {
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')

  const reminders = MOCK_REMINDERS.filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()))
  const pending = reminders.filter(r => r.status !== 'done')
  const overdue = pending.filter(r => new Date(r.dueAt) < new Date())

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reminders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Never miss an important task</p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>Add Reminder</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Due Today', value: pending.filter(r => new Date(r.dueAt).toDateString() === new Date().toDateString()).length, icon: Bell, color: 'amber' },
          { label: 'Overdue', value: overdue.length, icon: Clock, color: 'red' },
          { label: 'Completed', value: reminders.filter(r => r.status === 'done').length, icon: CheckCircle, color: 'green' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              <s.icon size={16} className="text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search reminders..." className="max-w-sm" />

      {/* List */}
      <div className="space-y-3">
        {reminders.map(r => (
          <div key={r.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-4 shadow-sm flex items-center gap-4 ${r.status === 'done' ? 'opacity-60 border-gray-100 dark:border-gray-700' : new Date(r.dueAt) < new Date() ? 'border-red-200 dark:border-red-900' : 'border-gray-200 dark:border-gray-700'}`}>
            <button className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${r.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-600 hover:border-brand-500'}`}>
              {r.status === 'done' && <CheckCircle size={12} className="text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm ${r.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{r.title}</p>
              <div className="flex items-center gap-3 mt-1">
                {r.contact && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Avatar name={r.contact.name} size="xs" />
                    {r.contact.name}
                  </span>
                )}
                <span className={`text-xs flex items-center gap-1 ${new Date(r.dueAt) < new Date() && r.status !== 'done' ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-400'}`}>
                  <Clock size={10} />
                  {format(new Date(r.dueAt), 'MMM d, h:mm a')}
                </span>
              </div>
            </div>
            <Badge variant={priorityColors[r.priority]} size="sm" className="capitalize">{r.priority}</Badge>
          </div>
        ))}

        {reminders.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Bell size={32} className="mx-auto mb-3 text-gray-300" />
            <p>No reminders found</p>
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Reminder" size="sm"
        footer={<><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button variant="primary">Save</Button></>}
      >
        <div className="space-y-4">
          <Input label="Title" placeholder="e.g. Call Ahmed about upgrade" />
          <Select label="Contact" options={[{ value: 'c1', label: 'Ahmed Al-Rashid' }, { value: 'c2', label: 'Priya Sharma' }]} value="" onChange={() => {}} placeholder="Select contact..." searchable />
          <Select label="Priority" options={[{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} value="" onChange={() => {}} placeholder="Select priority..." />
          <DatePicker label="Due At" />
        </div>
      </Modal>
    </div>
  )
}
