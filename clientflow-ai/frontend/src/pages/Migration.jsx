import { useEffect, useState } from 'react';
import { Database, Upload, ArrowRight, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import api from '../utils/api';

const STATUS_COLORS = {
  running:    'bg-blue-500/20 text-blue-400',
  completed:  'bg-emerald-500/20 text-emerald-400',
  rolled_back:'bg-yellow-500/20 text-yellow-400',
  failed:     'bg-red-500/20 text-red-400',
};

const DEFAULT_MAPPING = { name: 'name', email: 'email', whatsapp_number: 'phone', notes: 'notes', status: 'status' };

export default function Migration() {
  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('jobs');
  const [csvFile, setCsvFile]   = useState(null);
  const [mapping, setMapping]   = useState(DEFAULT_MAPPING);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState(null);

  const loadJobs = () => api.get('/migration/jobs').then(r => setJobs(r.data)).finally(() => setLoading(false));
  useEffect(() => { loadJobs(); }, []);

  const startMigration = async () => {
    if (!csvFile) return alert('Select a CSV file');
    const fd = new FormData();
    fd.append('file', csvFile);
    fd.append('mapping', JSON.stringify(mapping));
    try {
      const r = await api.post('/migration/start', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert(`Migration started! Job ID: ${r.data.jobId}`);
      setActiveTab('jobs');
      loadJobs();
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const rollback = async jobId => {
    if (!confirm('Rollback this migration? Inserted records will be deleted.')) return;
    try {
      await api.post(`/migration/rollback/${jobId}`);
      loadJobs();
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const checkStatus = async jobId => {
    const r = await api.get(`/migration/status/${jobId}`);
    setSelected(r.data);
  };

  const progress = job => {
    const total = job.total_rows || job.total || 1;
    const done  = job.processed_rows || job.processed || 0;
    return Math.round((done / total) * 100);
  };

  if (loading) return <div className="text-emerald-400 animate-pulse">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Database size={20} className="text-emerald-400" /> Data Migration</h2>
        <div className="flex gap-2">
          {['jobs', 'import', 'mapping'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${activeTab === tab ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'jobs' && (
        <div className="space-y-4">
          {jobs.map(job => (
            <div key={job.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm font-medium text-white font-mono">{job.id}</span>
                  <span className={`ml-3 text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status] || 'bg-gray-500/20 text-gray-400'}`}>{job.status}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => checkStatus(job.id)} className="text-xs text-blue-400 hover:text-blue-300">Refresh</button>
                  {job.status === 'completed' && (
                    <button onClick={() => rollback(job.id)} className="text-xs text-yellow-400 hover:text-yellow-300">Rollback</button>
                  )}
                </div>
              </div>
              <div className="w-full bg-[#2a2a2a] rounded-full h-2 mb-2">
                <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${progress(job)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{job.processed_rows || 0} / {job.total_rows || 0} rows</span>
                <span>{progress(job)}%</span>
              </div>
              {job.errors && JSON.parse(job.errors || '[]').length > 0 && (
                <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} /> {JSON.parse(job.errors).length} errors
                </div>
              )}
            </div>
          ))}
          {jobs.length === 0 && <p className="text-center text-gray-500 text-sm py-8">No migration jobs yet</p>}
        </div>
      )}

      {activeTab === 'import' && (
        <div className="space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setCsvFile(f); }}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${dragOver ? 'border-emerald-500 bg-emerald-500/5' : 'border-[#2a2a2a]'}`}>
            <Upload size={32} className="text-gray-500 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Drag &amp; drop CSV or</p>
            <label className="mt-2 inline-block cursor-pointer text-emerald-400 hover:text-emerald-300 text-sm">
              Browse file <input type="file" accept=".csv" className="hidden" onChange={e => setCsvFile(e.target.files[0])} />
            </label>
            {csvFile && <p className="mt-2 text-xs text-emerald-400">✓ {csvFile.name}</p>}
          </div>
          <button onClick={startMigration} disabled={!csvFile} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm">
            Start Migration
          </button>
        </div>
      )}

      {activeTab === 'mapping' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Field Mapping (Target ← Source)</h3>
          <div className="space-y-3 max-w-md">
            {Object.entries(mapping).map(([target, source]) => (
              <div key={target} className="flex items-center gap-3">
                <span className="text-sm text-emerald-400 w-32 font-mono">{target}</span>
                <ArrowRight size={14} className="text-gray-500" />
                <input value={source} onChange={e => setMapping(p => ({ ...p, [target]: e.target.value }))}
                  className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono" />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">Map target fields to CSV column names from your source file.</p>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-white mb-3">Job Status: {selected.jobId || selected.id}</h3>
            <pre className="text-xs text-gray-400 bg-[#0f0f0f] rounded-lg p-3 overflow-auto max-h-60">{JSON.stringify(selected, null, 2)}</pre>
            <button onClick={() => setSelected(null)} className="mt-3 text-sm text-gray-400 hover:text-white">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
