import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import SearchInput from '../../components/ui/SearchInput.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import Tabs from '../../components/ui/Tabs.jsx'
import { Plus, FileText, Eye, Copy, Edit, Trash2, MessageSquare } from 'lucide-react'

const MOCK_TEMPLATES = [
  { id: 't1', name: 'Flash Sale Promo', category: 'promotional', content: 'Hi {{name}}! 🎉 Exclusive flash sale for you — 30% OFF everything! Use code FLASH30. Valid for 48 hours only. Reply STOP to unsubscribe.', usageCount: 142, status: 'approved' },
  { id: 't2', name: 'Welcome Message', category: 'onboarding', content: 'Welcome to {{org_name}}, {{name}}! 👋 We\'re so glad you\'re here. Your account is all set up. Reply with any questions!', usageCount: 89, status: 'approved' },
  { id: 't3', name: 'Follow-up Reminder', category: 'followup', content: 'Hi {{name}}, just checking in! Did you get a chance to review our proposal? Happy to answer any questions. 😊', usageCount: 54, status: 'approved' },
  { id: 't4', name: 'Invoice Due Reminder', category: 'billing', content: 'Hi {{name}}, your invoice #{{invoice_id}} of ${{amount}} is due on {{due_date}}. Please make payment at your earliest convenience.', usageCount: 31, status: 'pending' },
  { id: 't5', name: 'Win-back Campaign', category: 'promotional', content: 'Hi {{name}}, we miss you! 💙 It\'s been a while. Here\'s a special 20% discount just for you: COMEBACK20. Come back and see what\'s new!', usageCount: 28, status: 'approved' },
]

const categories = ['all', 'promotional', 'onboarding', 'followup', 'billing', 'support']

export default function Templates() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [form, setForm] = useState({ name: '', category: '', content: '' })

  const templates = MOCK_TEMPLATES.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'all' || t.category === category
    return matchSearch && matchCat
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Templates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your message templates</p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>New Template</Button>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-1.5 text-sm rounded-full capitalize font-medium transition-colors ${category === c ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Search */}
      <SearchInput value={search} onChange={setSearch} placeholder="Search templates..." className="max-w-sm" />

      {/* Template grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {templates.map(t => (
          <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="neutral" size="sm" className="capitalize">{t.category}</Badge>
                  <Badge variant={t.status === 'approved' ? 'success' : 'warning'} size="sm" dot>{t.status}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPreviewTemplate(t)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors" title="Preview">
                  <Eye size={14} />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors" title="Copy">
                  <Copy size={14} />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors" title="Edit">
                  <Edit size={14} />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 font-mono">
              {t.content}
            </p>

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <MessageSquare size={12} /> Used {t.usageCount}× times
              </span>
              <Button variant="ghost" size="xs" icon={Plus}>Use Template</Button>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            <FileText size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="font-medium">No templates found</p>
            <p className="text-sm">Create your first template to get started</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Template"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary">Create Template</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Template Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Flash Sale Promo" />
          <Select
            label="Category"
            options={categories.slice(1).map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
            value={form.category}
            onChange={v => setForm(f => ({ ...f, category: v }))}
            placeholder="Select category..."
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={5}
              placeholder="Use {{variable}} for dynamic content..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">Variables: {'{{name}}'}, {'{{org_name}}'}, {'{{phone}}'}, {'{{date}}'}</p>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal open={!!previewTemplate} onClose={() => setPreviewTemplate(null)} title="Template Preview" size="sm">
        {previewTemplate && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="neutral" size="sm" className="capitalize">{previewTemplate.category}</Badge>
              <Badge variant={previewTemplate.status === 'approved' ? 'success' : 'warning'} size="sm" dot>{previewTemplate.status}</Badge>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-200 font-mono leading-relaxed">
              {previewTemplate.content}
            </div>
            <p className="text-xs text-gray-400 mt-3">Used {previewTemplate.usageCount} times</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
