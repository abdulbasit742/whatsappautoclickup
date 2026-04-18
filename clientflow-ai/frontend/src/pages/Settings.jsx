import { useEffect, useState } from 'react';
import { Save, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../components/Toast';

const TEXT_FIELDS = [
  { section: 'Business Info', fields: [
    { key: 'business_name',        label: 'Business Name',         placeholder: 'My Business' },
    { key: 'business_description', label: 'Business Description',  placeholder: 'Professional services for your needs', wide: true },
    { key: 'owner_whatsapp',       label: 'Owner WhatsApp Number', placeholder: '923001234567' },
  ]},
  { section: 'Payment Details', fields: [
    { key: 'easypaisa_number', label: 'Easypaisa Number', placeholder: '03001234567' },
    { key: 'jazzcash_number',  label: 'JazzCash Number',  placeholder: '03001234567' },
    { key: 'bank_details',     label: 'Bank Details',     placeholder: 'Bank: HBL, Acc: 0001-02345678-01', wide: true },
  ]},
  { section: 'Offline Message', fields: [
    { key: 'offline_message', label: 'Offline / After-hours Message', placeholder: 'We are offline. We will reply soon!', wide: true },
  ]},
  { section: 'Follow-Up Timings', fields: [
    { key: 'follow_up_cold_lead_hours',    label: 'Cold Lead Follow-up (hours)',       placeholder: '24', type: 'number' },
    { key: 'follow_up_payment_hours',      label: 'Payment Reminder Follow-up (hours)', placeholder: '24', type: 'number' },
    { key: 'follow_up_post_delivery_days', label: 'Post-Delivery Review (days)',        placeholder: '2',  type: 'number' },
    { key: 'follow_up_re_engagement_days', label: 'Re-engagement (days)',               placeholder: '14', type: 'number' },
  ]},
  { section: 'AI Configuration', fields: [
    { key: 'ai_provider_priority', label: 'AI Provider Priority (comma-separated)', placeholder: 'claude,openai,gemini,groq' },
  ]},
];

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [saving, setSaving]     = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/settings').then(r => setSettings(r.data));
  }, []);

  const update = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      toast('Settings saved successfully!', 'success');
    } catch (e) {
      toast('Failed to save: ' + (e.response?.data?.error || e.message), 'error');
    } finally { setSaving(false); }
  };

  const autoReply = settings['auto_reply_enabled'] === 'true';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Save size={16} /> {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Auto-Reply Toggle */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Auto-Reply Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Toggle */}
            <div className="flex items-center justify-between bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3">
              <div>
                <p className="text-sm text-white font-medium">Auto Reply</p>
                <p className="text-xs text-gray-500">Automatically respond to WhatsApp messages</p>
              </div>
              <button
                onClick={() => update('auto_reply_enabled', autoReply ? 'false' : 'true')}
                className={`transition-colors ${autoReply ? 'text-emerald-400' : 'text-gray-600'}`}
              >
                {autoReply ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
              </button>
            </div>

            {/* Working Hours */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Working Hours Start</label>
                <input
                  type="time"
                  value={settings['working_hours_start'] || '09:00'}
                  onChange={e => update('working_hours_start', e.target.value)}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Working Hours End</label>
                <input
                  type="time"
                  value={settings['working_hours_end'] || '22:00'}
                  onChange={e => update('working_hours_end', e.target.value)}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* All other text fields */}
        {TEXT_FIELDS.map(({ section, fields }) => (
          <div key={section} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">{section}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map(({ key, label, placeholder, wide, type }) => (
                <div key={key} className={wide ? 'md:col-span-2' : ''}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  {wide ? (
                    <textarea
                      value={settings[key] || ''}
                      onChange={e => update(key, e.target.value)}
                      rows={2}
                      placeholder={placeholder}
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  ) : (
                    <input
                      type={type || 'text'}
                      value={settings[key] || ''}
                      onChange={e => update(key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
