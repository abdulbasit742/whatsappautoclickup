import { useState } from 'react'
import Tabs from '../../components/ui/Tabs.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'

const TABS = [{key:'org',label:'Organization'},{key:'notifications',label:'Notifications'},{key:'security',label:'Security'},{key:'ai',label:'AI Settings'},{key:'campaign',label:'Campaign Defaults'}]
const NOTIF_TOGGLES = ['New message received','Lead stage change','Follow-up due','Campaign completed','Issue assigned','Team member joined','Invoice due']

export default function Settings() {
  const [tab, setTab] = useState('org')
  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1><p className="text-sm text-gray-500 mt-0.5">Configure your workspace</p></div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'org' && <Card header="Organization Settings"><div className="space-y-4"><Input label="Organization Name" defaultValue="Acme Corp" /><Select label="Timezone" options={[{value:'UTC',label:'UTC'},{value:'America/NY',label:'America/New York'},{value:'Asia/Dubai',label:'Asia/Dubai'}]} value="UTC" onChange={()=>{}}/><Select label="Language" options={[{value:'en',label:'English'},{value:'ar',label:'Arabic'}]} value="en" onChange={()=>{}}/><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo</label><div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">Upload</div></div><Button variant="primary">Save Changes</Button></div></Card>}
      {tab === 'notifications' && <Card header="Notification Preferences"><div className="space-y-4">{NOTIF_TOGGLES.map(t=><div key={t} className="flex items-center justify-between"><span className="text-sm text-gray-700 dark:text-gray-200">{t}</span><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" defaultChecked className="sr-only peer"/><div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"/></label></div>)}</div></Card>}
      {tab === 'security' && <Card header="Security"><div className="space-y-4"><Input label="Current Password" type="password" /><Input label="New Password" type="password" /><Input label="Confirm New Password" type="password" /><Button variant="primary">Update Password</Button><div className="border-t pt-4 border-gray-200 dark:border-gray-700"><p className="font-medium text-sm text-gray-900 dark:text-white mb-1">Two-Factor Authentication</p><p className="text-sm text-gray-500 mb-3">Add an extra layer of security to your account</p><Button variant="outline" size="sm">Enable 2FA</Button></div></div></Card>}
      {tab === 'ai' && <Card header="AI Settings"><div className="space-y-4"><Select label="Default AI Provider" options={[{value:'groq',label:'Groq (Recommended)'},{value:'openai',label:'OpenAI'},{value:'claude',label:'Claude'},{value:'gemini',label:'Gemini'}]} value="groq" onChange={()=>{}}/><Select label="Default Model" options={[{value:'llama3-70b',label:'Llama 3 70B'},{value:'llama3-8b',label:'Llama 3 8B'}]} value="llama3-70b" onChange={()=>{}}/><Button variant="primary">Save AI Settings</Button></div></Card>}
      {tab === 'campaign' && <Card header="Campaign Defaults"><div className="space-y-4"><Select label="Default Template" options={[{value:'promo',label:'Promotional'},{value:'newsletter',label:'Newsletter'}]} value="" onChange={()=>{}} placeholder="Select default template..."/><Input label="Max Retry Attempts" type="number" defaultValue="3" /><Input label="Retry Interval (minutes)" type="number" defaultValue="30" /><Button variant="primary">Save Defaults</Button></div></Card>}
    </div>
  )
}
