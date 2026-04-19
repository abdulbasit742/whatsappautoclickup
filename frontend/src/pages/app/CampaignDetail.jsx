import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { campaignsService } from '../../services/campaigns.service.js'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import StatusChip from '../../components/ui/StatusChip.jsx'
import Button from '../../components/ui/Button.jsx'
import ProgressBar from '../../components/ui/ProgressBar.jsx'
import { PageSpinner } from '../../components/ui/Spinner.jsx'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ArrowLeft, Users, Send, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'

const MOCK = {
  id: 'cp1', name: 'Q3 Flash Sale Promo', status: 'running', audience: 2400,
  sent: 2100, delivered: 1998, failed: 102, rate: 95.1,
  schedule: new Date().toISOString(), template: 'Flash Sale',
  logs: [
    { id: 'l1', contact: 'Ahmed Al-Rashid', phone: '+971501234567', status: 'delivered', sentAt: new Date().toISOString() },
    { id: 'l2', contact: 'Priya Sharma', phone: '+919876543210', status: 'delivered', sentAt: new Date().toISOString() },
    { id: 'l3', contact: 'John Mitchell', phone: '+14155551234', status: 'failed', sentAt: new Date().toISOString() },
  ],
}

const COLORS = { delivered: '#10b981', failed: '#ef4444', pending: '#f59e0b' }

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsService.get(id),
    placeholderData: MOCK,
  })

  if (isLoading && !data) return <PageSpinner />
  const c = data || MOCK

  const pieData = [
    { name: 'Delivered', value: c.delivered || 0, color: COLORS.delivered },
    { name: 'Failed', value: c.failed || 0, color: COLORS.failed },
    { name: 'Pending', value: Math.max(0, (c.audience || 0) - (c.sent || 0)), color: COLORS.pending },
  ].filter(d => d.value > 0)

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/app/campaigns')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft size={16} /> Back to Campaigns
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{c.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusChip status={c.status} />
            <span className="text-sm text-gray-500 dark:text-gray-400">Template: {c.template}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">Scheduled: {format(new Date(c.schedule), 'MMM d, yyyy h:mm a')}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Edit</Button>
          <Button variant="danger" size="sm">Pause</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Audience', value: c.audience?.toLocaleString(), icon: Users, color: 'blue' },
          { label: 'Sent', value: c.sent?.toLocaleString(), icon: Send, color: 'brand' },
          { label: 'Delivered', value: c.delivered?.toLocaleString(), icon: CheckCircle, color: 'green' },
          { label: 'Failed', value: c.failed?.toLocaleString(), icon: XCircle, color: 'red' },
        ].map(s => (
          <Card key={s.label}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">{s.label}</p>
              <s.icon size={16} className="text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value || '—'}</p>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <Card header="Delivery Breakdown">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Progress */}
        <Card header="Campaign Progress">
          <div className="space-y-4">
            <ProgressBar label="Sent" value={c.sent || 0} max={c.audience || 1} color="brand" showValue />
            <ProgressBar label="Delivered" value={c.delivered || 0} max={c.audience || 1} color="green" showValue />
            <ProgressBar label="Failed" value={c.failed || 0} max={c.audience || 1} color="red" showValue />
          </div>
          <div className="mt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Delivery Rate</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{c.rate}%</p>
          </div>
        </Card>
      </div>

      {/* Delivery Logs */}
      <Card header="Delivery Logs" padding={false}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                {['Contact', 'Phone', 'Status', 'Sent At'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {(c.logs || []).map(log => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{log.contact}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{log.phone}</td>
                  <td className="px-4 py-3"><StatusChip status={log.status} size="sm" /></td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{format(new Date(log.sentAt), 'h:mm a')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
