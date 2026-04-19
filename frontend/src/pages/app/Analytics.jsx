import { useState } from 'react'
import Tabs from '../../components/ui/Tabs.jsx'
import Card from '../../components/ui/Card.jsx'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

const days14 = Array.from({length:14},(_,i)=>({date:format(new Date(Date.now()-(13-i)*86400000),'MMM d'),value:Math.floor(Math.random()*200)+100,value2:Math.floor(Math.random()*150)+50}))
const months6 = ['Jan','Feb','Mar','Apr','May','Jun'].map(m=>({name:m,sent:Math.floor(Math.random()*5000)+2000,delivered:Math.floor(Math.random()*4500)+1800,opened:Math.floor(Math.random()*2000)+800}))
const FUNNEL = [{name:'New',value:1200,color:'#60a5fa'},{name:'Warm',value:800,color:'#f59e0b'},{name:'Hot',value:400,color:'#ef4444'},{name:'Customer',value:200,color:'#10b981'}]

const TABS = [
  {key:'overview',label:'Overview'},{key:'messaging',label:'Messaging'},{key:'campaigns',label:'Campaigns'},
  {key:'crm',label:'CRM'},{key:'ai',label:'AI Usage'},{key:'team',label:'Team'},{key:'billing',label:'Billing'}
]

function ChartCard({title,children,height=220}){return <Card header={title}><ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer></Card>}

export default function Analytics() {
  const [tab, setTab] = useState('overview')
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1><p className="text-sm text-gray-500 mt-0.5">Insights across your entire platform</p></div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[{l:'Total Contacts',v:'12,847'},{l:'Messages Sent',v:'48,200'},{l:'AI Requests',v:'28,420'},{l:'Campaigns',v:'24'}].map(s=>(
              <div key={s.l} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"><p className="text-xs text-gray-500 mb-1">{s.l}</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{s.v}</p></div>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Conversations Over Time"><AreaChart data={days14}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="date" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Area type="monotone" dataKey="value" stroke="#0ea5e9" fill="#bae6fd" name="Conversations"/></AreaChart></ChartCard>
            <ChartCard title="Lead Funnel"><BarChart data={FUNNEL} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" tick={{fontSize:11}}/><YAxis dataKey="name" type="category" tick={{fontSize:11}} width={70}/><Tooltip/><Bar dataKey="value" radius={[0,4,4,0]}>{FUNNEL.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar></BarChart></ChartCard>
          </div>
        </div>
      )}
      {tab === 'messaging' && (
        <div className="space-y-6">
          <ChartCard title="Message Volume" height={260}><AreaChart data={days14}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Legend/><Area type="monotone" dataKey="value" stroke="#0ea5e9" fill="#bae6fd" name="Inbound"/><Area type="monotone" dataKey="value2" stroke="#8b5cf6" fill="#ede9fe" name="Outbound"/></AreaChart></ChartCard>
        </div>
      )}
      {tab === 'campaigns' && (
        <ChartCard title="Campaign Performance" height={280}><BarChart data={months6}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Legend/><Bar dataKey="sent" fill="#cbd5e1" name="Sent" radius={[4,4,0,0]}/><Bar dataKey="delivered" fill="#0ea5e9" name="Delivered" radius={[4,4,0,0]}/><Bar dataKey="opened" fill="#10b981" name="Opened" radius={[4,4,0,0]}/></BarChart></ChartCard>
      )}
      {tab === 'crm' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <ChartCard title="Contact Growth"><LineChart data={days14}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} name="New Contacts"/></LineChart></ChartCard>
          <ChartCard title="Lead Stage Distribution"><PieChart><Pie data={FUNNEL} cx="50%" cy="50%" outerRadius={90} dataKey="value">{FUNNEL.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip/><Legend/></PieChart></ChartCard>
        </div>
      )}
      {(tab === 'ai' || tab === 'team' || tab === 'billing') && (
        <ChartCard title="Trend"><AreaChart data={days14}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Area type="monotone" dataKey="value" stroke="#0ea5e9" fill="#bae6fd" name="Value"/></AreaChart></ChartCard>
      )}
    </div>
  )
}
