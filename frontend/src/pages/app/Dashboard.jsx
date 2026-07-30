import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '../../services/analytics.service.js'
import KPICard from '../../components/ui/KPICard.jsx'
import Card from '../../components/ui/Card.jsx'
import ProgressBar from '../../components/ui/ProgressBar.jsx'
import { PageSpinner } from '../../components/ui/Spinner.jsx'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Users, MessageSquare, TrendingUp, ListChecks, AlertCircle,
  Megaphone, DollarSign, Cpu, Zap, ArrowRight, Clock
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore.js'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'

const MOCK_DASHBOARD = {
  kpis: {
    totalContacts: 12847, activeLeads: 3291, openConversations: 247,
    pendingFollowups: 89, openIssues: 12, runningCampaigns: 4,
    revenue: 48920, aiRequestsToday: 1482,
  },
  conversationsChart: Array.from({ length: 14 }, (_, i) => ({
    date: format(new Date(Date.now() - (13 - i) * 86400000), 'MMM d'),
    inbound: Math.floor(Math.random() * 80) + 20,
    outbound: Math.floor(Math.random() * 60) + 10,
  })),
  leadConversion: [
    { name: 'New', value: 35, color: '#60a5fa' },
    { name: 'Warm', value: 25, color: '#f59e0b' },
    { name: 'Hot', value: 20, color: '#ef4444' },
    { name: 'Customer', value: 15, color: '#10b981' },
    { name: 'Lost', value: 5, color: '#9ca3af' },
  ],
  campaignPerformance: [
    { name: 'Jan', sent: 4200, delivered: 3900 },
    { name: 'Feb', sent: 5100, delivered: 4800 },
    { name: 'Mar', sent: 4700, delivered: 4400 },
    { name: 'Apr', sent: 6200, delivered: 5900 },
    { name: 'May', sent: 7100, delivered: 6700 },
    { name: 'Jun', sent: 8400, delivered: 7900 },
  ],
  recentActivity: [
    { id: 1, type: 'message', text: 'New message from Ahmed Al-Rashid', time: '2m ago', icon: '💬' },
    { id: 2, type: 'lead', text: 'Lead scored: Priya Sharma → Hot', time: '5m ago', icon: '🔥' },
    { id: 3, type: 'campaign', text: 'Campaign "Q3 Promo" completed — 94% delivery', time: '12m ago', icon: '🚀' },
    { id: 4, type: 'issue', text: 'Issue #142 resolved by Sarah J.', time: '18m ago', icon: '✅' },
    { id: 5, type: 'followup', text: '8 follow-ups due in the next hour', time: '25m ago', icon: '⏰' },
    { id: 6, type: 'contact', text: '47 new contacts imported via CSV', time: '1h ago', icon: '👥' },
  ],
  planUsage: { contacts: 73, messages: 45, aiRequests: 82, seats: 60 },
}

export default function Dashboard() {
  const { org, user } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsService.dashboard(),
    placeholderData: MOCK_DASHBOARD,
  })

  const d = data || MOCK_DASHBOARD
  const kpis = d.kpis || {}

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Here's what's happening with your business today.</p>
        </div>
        <Link to="/app/analytics" className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:underline">
          Full Analytics <ArrowRight size={14} />
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4">
        <KPICard loading={isLoading} title="Total Contacts" value={kpis.totalContacts?.toLocaleString()} trend="up" trendValue="+12% this week" icon={Users} color="blue" />
        <KPICard loading={isLoading} title="Active Leads" value={kpis.activeLeads?.toLocaleString()} trend="up" trendValue="+8% this week" icon={TrendingUp} color="green" />
        <KPICard loading={isLoading} title="Open Conversations" value={kpis.openConversations?.toLocaleString()} trend="up" trendValue="+24% today" icon={MessageSquare} color="purple" />
        <KPICard loading={isLoading} title="Pending Follow-ups" value={kpis.pendingFollowups?.toLocaleString()} trend="down" trendValue="-5 from yesterday" icon={ListChecks} color="orange" />
        <KPICard loading={isLoading} title="Open Issues" value={kpis.openIssues?.toLocaleString()} trend="neutral" trendValue="No change" icon={AlertCircle} color="red" />
        <KPICard loading={isLoading} title="Running Campaigns" value={kpis.runningCampaigns?.toLocaleString()} trend="up" trendValue="+2 launched" icon={Megaphone} color="brand" />
        <KPICard loading={isLoading} title="Revenue (MTD)" value={`$${(kpis.revenue || 0).toLocaleString()}`} trend="up" trendValue="+18% vs last month" icon={DollarSign} color="green" />
        <KPICard loading={isLoading} title="AI Requests Today" value={kpis.aiRequestsToday?.toLocaleString()} trend="up" trendValue="+31% vs yesterday" icon={Cpu} color="purple" />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Conversations Over Time */}
        <div className="lg:col-span-2">
          <Card header="Conversations Over Time">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={d.conversationsChart || []}>
                <defs>
                  <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="inbound" stroke="#0ea5e9" fill="url(#inboundGrad)" strokeWidth={2} name="Inbound" />
                <Area type="monotone" dataKey="outbound" stroke="#8b5cf6" fill="url(#outboundGrad)" strokeWidth={2} name="Outbound" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Lead Conversion */}
        <Card header="Lead Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={d.leadConversion || []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                {(d.leadConversion || []).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Second row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Campaign Performance */}
        <div className="lg:col-span-2">
          <Card header="Campaign Performance">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.campaignPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" fill="#cbd5e1" name="Sent" radius={[4, 4, 0, 0]} />
                <Bar dataKey="delivered" fill="#0ea5e9" name="Delivered" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Activity Feed + Plan Usage */}
        <div className="space-y-6">
          {/* Activity Feed */}
          <Card header="Recent Activity" padding={false}>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {(d.recentActivity || []).slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="text-lg mt-0.5">{activity.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug">{activity.text}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1"><Clock size={10} />{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Plan Usage */}
      <Card header={
        <div className="flex items-center justify-between w-full">
          <span className="font-semibold text-gray-900 dark:text-white">Plan Usage</span>
          <Link to="/app/billing" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">Manage Plan</Link>
        </div>
      }>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Contacts', value: d.planUsage?.contacts || 73, color: 'brand' },
            { label: 'Messages', value: d.planUsage?.messages || 45, color: 'green' },
            { label: 'AI Requests', value: d.planUsage?.aiRequests || 82, color: 'purple' },
            { label: 'Seats', value: d.planUsage?.seats || 60, color: 'orange' },
          ].map(item => (
            <ProgressBar
              key={item.label}
              label={item.label}
              value={item.value}
              max={100}
              color={item.color}
              showValue
              size="md"
            />
          ))}
        </div>
      </Card>

      {/* AI Recommendations */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl shrink-0">
            <Zap size={20} className="text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white mb-1">AI Recommendation</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Based on your data, 23 leads haven't been contacted in 7+ days. Consider launching a re-engagement campaign.
              Also, 8 follow-ups are overdue — addressing them now could recover ~$12,400 in pipeline value.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <Link to="/app/campaigns" className="btn-primary text-xs px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors">
                Create Campaign
              </Link>
              <Link to="/app/followups" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">View Follow-ups</Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
