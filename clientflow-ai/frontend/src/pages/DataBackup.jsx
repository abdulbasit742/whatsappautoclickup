import { useEffect, useState } from 'react';
import { Database, Download, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../utils/api';

export default function DataBackup() {
  const [jobs, setJobs]         = useState([]);
  const [running, setRunning]   = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const load = async () => {
    const r = await api.get('/backup');
    setJobs(r.data);
  };

  useEffect(() => { load(); }, []);

  const runBackup = async () => {
    setRunning(true);
    try {
      const r = await api.post('/backup');
      setLastResult(r.data);
      load();
    } catch (err) {
      alert('Backup failed: ' + (err.response?.data?.error || err.message));
    } finally { setRunning(false); }
  };

  const formatBytes = (b) => {
    if (!b) return '—';
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Data Backup</h2>

      {/* Backup action */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Database size={22} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white mb-1">Manual Backup</h3>
            <p className="text-sm text-gray-500 mb-4">
              Creates a full JSON backup of all your data including clients, messages, payments, templates, and more.
            </p>
            <button onClick={runBackup} disabled={running}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <Database size={15} />
              {running ? 'Creating Backup...' : 'Create Backup Now'}
            </button>
          </div>
        </div>

        {lastResult && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 mt-4">
            <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-emerald-400 font-medium">Backup created — {formatBytes(lastResult.size_bytes)}</p>
            </div>
            <a href={lastResult.file_url} target="_blank" rel="noreferrer"
              className="text-xs text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1">
              <Download size={12} /> Download
            </a>
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { icon: Database, color: 'emerald', label: 'Total Backups', value: jobs.length },
          { icon: CheckCircle, color: 'blue', label: 'Successful', value: jobs.filter(j => j.status === 'done').length },
          { icon: AlertCircle, color: 'red', label: 'Failed', value: jobs.filter(j => j.status === 'failed').length },
        ].map(({ icon: Icon, color, label, value }) => (
          <div key={label} className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-3`}>
            <div className={`p-2 rounded-lg bg-${color}-500/10`}>
              <Icon size={18} className={`text-${color}-400`} />
            </div>
            <div>
              <div className="text-lg font-bold text-white">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Backup history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Backup History</h3>
          <button onClick={load}><RefreshCw size={14} className="text-gray-500 hover:text-gray-300" /></button>
        </div>
        {jobs.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500">No backups yet</div>
        ) : (
          <div className="space-y-2">
            {jobs.map(j => (
              <div key={j.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {j.status === 'done'
                    ? <CheckCircle size={16} className="text-emerald-400" />
                    : j.status === 'failed'
                    ? <AlertCircle size={16} className="text-red-400" />
                    : <Clock size={16} className="text-yellow-400" />
                  }
                  <div>
                    <p className="text-sm text-white capitalize">{j.type} backup</p>
                    <p className="text-xs text-gray-500">{new Date(j.created_at).toLocaleString()} · {formatBytes(j.size_bytes)}</p>
                    {j.error && <p className="text-xs text-red-400 mt-0.5">{j.error}</p>}
                  </div>
                </div>
                {j.file_url && j.status === 'done' && (
                  <a href={j.file_url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300">
                    <Download size={16} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
