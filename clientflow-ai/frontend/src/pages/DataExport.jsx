import { useEffect, useState } from 'react';
import { Download, FileText, RefreshCw, Plus, CheckCircle } from 'lucide-react';
import api from '../utils/api';

const ENTITY_OPTIONS = [
  { value: 'clients',   label: 'Contacts / Clients' },
  { value: 'payments',  label: 'Payments' },
  { value: 'messages',  label: 'Messages' },
  { value: 'analytics', label: 'Analytics Report' },
];

export default function DataExport() {
  const [jobs, setJobs]       = useState([]);
  const [form, setForm]       = useState({ entity_type: 'clients', format: 'csv' });
  const [exporting, setExporting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const loadJobs = async () => {
    const r = await api.get('/export');
    setJobs(r.data);
  };

  useEffect(() => { loadJobs(); }, []);

  const runExport = async () => {
    setExporting(true);
    try {
      const r = await api.post('/export', form);
      setLastResult(r.data);
      loadJobs();
    } catch (err) {
      alert('Export failed: ' + (err.response?.data?.error || err.message));
    } finally { setExporting(false); }
  };

  const download = (url) => {
    window.open(url.replace('/api', ''), '_blank');
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Data Export</h2>

      {/* Export form */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Generate Export</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data Type</label>
            <select value={form.entity_type} onChange={e => setForm(f => ({ ...f, entity_type: e.target.value }))}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
              {ENTITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Format</label>
            <select value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
              <option value="csv">CSV</option>
              <option value="excel">Excel (CSV)</option>
              <option value="pdf">PDF (CSV)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={runExport} disabled={exporting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
              <Download size={16} />
              {exporting ? 'Generating...' : 'Export Now'}
            </button>
          </div>
        </div>

        {lastResult && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">
            <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-emerald-400 font-medium">Export ready — {lastResult.rows} rows</p>
            </div>
            <button onClick={() => download(lastResult.file_url)}
              className="text-xs text-emerald-400 hover:text-emerald-300 underline">
              Download
            </button>
          </div>
        )}
      </div>

      {/* Export history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Export History</h3>
          <button onClick={loadJobs}><RefreshCw size={14} className="text-gray-500 hover:text-gray-300" /></button>
        </div>
        {jobs.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500">No exports yet</div>
        ) : (
          <div className="space-y-2">
            {jobs.map(j => (
              <div key={j.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-gray-500" />
                  <div>
                    <p className="text-sm text-white capitalize">{j.entity_type} — {j.format?.toUpperCase()}</p>
                    <p className="text-xs text-gray-500">{new Date(j.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${j.status === 'done' ? 'bg-emerald-500/20 text-emerald-400' : j.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {j.status}
                  </span>
                  {j.file_url && j.status === 'done' && (
                    <button onClick={() => download(j.file_url)} className="text-emerald-400 hover:text-emerald-300">
                      <Download size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
