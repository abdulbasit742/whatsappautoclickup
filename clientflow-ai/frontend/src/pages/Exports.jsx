import { useEffect, useState } from 'react';
import { Download, FileText, Plus } from 'lucide-react';
import api from '../utils/api';

const EXPORT_TYPES = [
  { type: 'contacts',      label: 'Contacts CSV',      icon: '👥', desc: 'All contact records' },
  { type: 'campaigns',     label: 'Campaigns CSV',     icon: '📣', desc: 'Campaign logs' },
  { type: 'ai_usage',      label: 'AI Usage Report',   icon: '🤖', desc: 'AI provider usage' },
  { type: 'issues',        label: 'Issues Report',     icon: '🐛', desc: 'All issues and SLA data' },
  { type: 'payments',      label: 'Payments Report',   icon: '💳', desc: 'Payment history' },
  { type: 'analytics_pdf', label: 'Analytics PDF',     icon: '📊', desc: 'Summary analytics PDF' },
];

const STATUS_COLORS = { pending: 'text-yellow-400', processing: 'text-blue-400', done: 'text-emerald-400', failed: 'text-red-400' };

export default function Exports() {
  const [jobs, setJobs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setReq] = useState('');

  const load = () => api.get('/exports').then(r => setJobs(r.data));

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const request = async (type) => {
    setReq(type);
    const r = await api.post('/exports', { type }).catch(e => ({ data: null }));
    if (r.data) {
      if (r.data.file_url) window.open(r.data.file_url, '_blank');
      await load();
    }
    setReq('');
  };

  if (loading) return <div className="text-gray-400">Loading exports...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Download size={22} className="text-blue-400" />
        <h2 className="text-xl font-bold text-white">Report Exports</h2>
      </div>

      {/* Export actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {EXPORT_TYPES.map(et => (
          <button key={et.type} onClick={() => request(et.type)} disabled={!!requesting}
            className="bg-[#1a1a1a] border border-[#2a2a2a] hover:border-emerald-500/40 rounded-xl p-4 text-left transition-colors disabled:opacity-50">
            <div className="text-2xl mb-2">{et.icon}</div>
            <div className="text-white font-medium text-sm">{et.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{et.desc}</div>
            {requesting === et.type && <div className="text-xs text-emerald-400 mt-2">Generating...</div>}
          </button>
        ))}
      </div>

      {/* Recent exports */}
      <h3 className="text-sm font-semibold text-white mb-3">Recent Exports</h3>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              {['Type','Status','Requested','File'].map(h => <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {jobs.map(j => (
              <tr key={j.id} className="border-b border-[#1e1e1e] hover:bg-[#222]">
                <td className="px-4 py-2.5 text-white capitalize">{j.type.replace('_',' ')}</td>
                <td className={`px-4 py-2.5 font-medium ${STATUS_COLORS[j.status]}`}>{j.status}</td>
                <td className="px-4 py-2.5 text-gray-500">{new Date(j.created_at).toLocaleString()}</td>
                <td className="px-4 py-2.5">
                  {j.file_url
                    ? <a href={j.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"><Download size={12}/> Download</a>
                    : <span className="text-gray-600 text-xs">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 && <div className="text-center text-gray-500 py-8">No exports yet.</div>}
      </div>
    </div>
  );
}
