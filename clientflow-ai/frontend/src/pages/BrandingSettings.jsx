import { useState, useEffect } from 'react';
import { Upload, Palette, Save } from 'lucide-react';
import { useToast } from '../components/Toast';
import api from '../utils/api';

const ORG_ID = 'demo-org';

export default function BrandingSettings() {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    company_name: '', logo_url: '', favicon_url: '',
    primary_color: '#10b981', secondary_color: '#3b82f6', support_email: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/branding/${ORG_ID}`).then(r => { if (r.data?.org_id) setForm({ ...form, ...r.data }); }).catch(() => {});
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/branding/${ORG_ID}`, form);
      showToast('Branding saved!', 'success');
    } catch { showToast('Failed to save', 'error'); }
    setSaving(false);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Branding Settings</h1>

      <form onSubmit={save} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 space-y-5">
        {/* Company Name */}
        <div>
          <label className="text-sm text-gray-400 block mb-1">Company Name</label>
          <input value={form.company_name} onChange={e => set('company_name', e.target.value)}
            className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            placeholder="Acme Inc." />
        </div>

        {/* Support Email */}
        <div>
          <label className="text-sm text-gray-400 block mb-1">Support Email</label>
          <input type="email" value={form.support_email} onChange={e => set('support_email', e.target.value)}
            className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            placeholder="support@company.com" />
        </div>

        {/* Logo URL */}
        <div>
          <label className="text-sm text-gray-400 block mb-1">Logo URL</label>
          <div className="flex gap-3 items-center">
            {form.logo_url && <img src={form.logo_url} alt="logo" className="h-10 w-10 rounded object-contain bg-[#2a2a2a]" />}
            <input value={form.logo_url} onChange={e => set('logo_url', e.target.value)}
              className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="https://..." />
          </div>
        </div>

        {/* Favicon URL */}
        <div>
          <label className="text-sm text-gray-400 block mb-1">Favicon URL</label>
          <input value={form.favicon_url} onChange={e => set('favicon_url', e.target.value)}
            className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            placeholder="https://..." />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Primary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.primary_color} onChange={e => set('primary_color', e.target.value)}
                className="w-10 h-8 rounded cursor-pointer bg-transparent border border-[#3a3a3a]" />
              <input value={form.primary_color} onChange={e => set('primary_color', e.target.value)}
                className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="#10b981" />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Secondary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.secondary_color} onChange={e => set('secondary_color', e.target.value)}
                className="w-10 h-8 rounded cursor-pointer bg-transparent border border-[#3a3a3a]" />
              <input value={form.secondary_color} onChange={e => set('secondary_color', e.target.value)}
                className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="#3b82f6" />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 rounded-lg border border-[#2a2a2a] bg-[#111]">
          <p className="text-xs text-gray-500 mb-2">Preview</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: form.primary_color }} />
            <span className="text-white text-sm font-semibold">{form.company_name || 'Your Company'}</span>
            <button type="button" className="ml-auto text-xs px-3 py-1 rounded" style={{ backgroundColor: form.primary_color, color: '#fff' }}>
              Primary
            </button>
            <button type="button" className="text-xs px-3 py-1 rounded" style={{ backgroundColor: form.secondary_color, color: '#fff' }}>
              Secondary
            </button>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          <Save size={14} /> {saving ? 'Saving...' : 'Save Branding'}
        </button>
      </form>
    </div>
  );
}
