import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import api from '../utils/api';

const FIELDS = [
  { section: 'Business Info', keys: [
    { key: 'business_name',        label: 'Business Name' },
    { key: 'business_description', label: 'Business Description' },
    { key: 'owner_whatsapp',       label: 'Owner WhatsApp Number' },
  ]},
  { section: 'Payment Details', keys: [
    { key: 'easypaisa_number', label: 'Easypaisa Number' },
    { key: 'jazzcash_number',  label: 'JazzCash Number' },
    { key: 'bank_details',     label: 'Bank Details' },
  ]},
  { section: 'Auto-Reply Settings', keys: [
    { key: 'auto_reply_enabled',  label: 'Auto Reply Enabled (true/false)' },
    { key: 'working_hours_start', label: 'Working Hours Start (HH:MM)' },
    { key: 'working_hours_end',   label: 'Working Hours End (HH:MM)' },
    { key: 'offline_message',     label: 'Offline Message' },
  ]},
  { section: 'Follow-Up Timings', keys: [
    { key: 'follow_up_cold_lead_hours',     label: 'Cold Lead Follow-up (hours)' },
    { key: 'follow_up_payment_hours',       label: 'Payment Follow-up (hours)' },
    { key: 'follow_up_post_delivery_days',  label: 'Post-Delivery Follow-up (days)' },
    { key: 'follow_up_re_engagement_days',  label: 'Re-engagement Follow-up (days)' },
  ]},
  { section: 'AI Configuration', keys: [
    { key: 'ai_provider_priority', label: 'AI Provider Priority (comma-separated)' },
  ]},
];

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    api.get('/settings').then(r => setSettings(r.data));
  }, []);

  const update = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const save = async () => {
    await api.put('/settings', settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <button onClick={save} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Save size={16} /> {saved ? 'Saved!' : 'Save All'}
        </button>
      </div>

      <div className="space-y-6">
        {FIELDS.map(({ section, keys }) => (
          <div key={section} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">{section}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {keys.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <input
                    value={settings[key] || ''}
                    onChange={e => update(key, e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
