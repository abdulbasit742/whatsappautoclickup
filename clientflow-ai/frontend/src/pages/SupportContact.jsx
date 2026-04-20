import { useState } from 'react';
import { Send, Paperclip, CheckCircle2 } from 'lucide-react';
import { useToast } from '../components/Toast';
import api from '../utils/api';

const CATEGORIES = ['billing','technical','feature_request','bug','other'];
const ORG_ID = 'demo-org';

export default function SupportContact() {
  const { showToast } = useToast();
  const [form, setForm] = useState({ name:'', email:'', category:'technical', message:'', attachment_url:'' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(k,v) { setForm(f => ({...f, [k]: v})); }

  async function submit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return showToast('Fill in required fields', 'error');
    setLoading(true);
    try {
      await api.post('/support', { ...form, org_id: ORG_ID });
      setSubmitted(true);
    } catch { showToast('Submission failed. Please try again.', 'error'); }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <CheckCircle2 size={56} className="text-emerald-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Request Submitted!</h2>
        <p className="text-gray-400 text-sm">We've received your message and will get back to you shortly at <span className="text-white">{form.email}</span>.</p>
        <button onClick={() => { setSubmitted(false); setForm({ name:'', email:'', category:'technical', message:'', attachment_url:'' }); }}
          className="mt-4 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Contact Support</h1>
        <p className="text-gray-400 text-sm mt-1">Our team typically responds within 24 hours.</p>
      </div>

      <form onSubmit={submit} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Name <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="John Smith" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Email <span className="text-red-400">*</span></label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="you@company.com" />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}
            className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Message <span className="text-red-400">*</span></label>
          <textarea value={form.message} onChange={e => set('message', e.target.value)} required rows={5}
            className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-y"
            placeholder="Describe your issue in detail..." />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Attachment URL (optional)</label>
          <div className="flex items-center gap-2">
            <Paperclip size={14} className="text-gray-500" />
            <input value={form.attachment_url} onChange={e => set('attachment_url', e.target.value)}
              className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="https://..." />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          <Send size={14} /> {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}
