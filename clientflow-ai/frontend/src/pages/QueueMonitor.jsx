import { useEffect, useState } from 'react';
import { Server, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';
import api from '../utils/api';

const QUEUES = ['campaigns','followups','ai_jobs','notifications','webhooks'];

export default function QueueMonitor() {
  const [stats, setStats]   = useState({});
  const [failed, setFailed] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [st, fl] = await Promise.all([
      api.get('/queue/stats').then(r => r.data),
      api.get('/queue/failed').then(r => r.data),
    ]);
    setStats(st);
    setFailed(fl);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  if (loading) return <div className="text-gray-400">Loading queue monitor...</div>;

  const totalActive = QUEUES.reduce((a, q) => a + (stats[q]?.active || 0), 0);
  const totalFailed = QUEUES.reduce((a, q) => a + (stats[q]?.failed || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Server size={20} className="text-blue-400" /> Queue Monitor</h2>
        <button onClick={load} className="text-sm bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 px-4 py-2 rounded-xl hover:text-white">🔄 Refresh</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{totalActive}</div>
          <div className="text-xs text-gray-500">Active Jobs</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{totalFailed}</div>
          <div className="text-xs text-gray-500">Failed Jobs</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{QUEUES.reduce((a,q) => a + (stats[q]?.retried||0), 0)}</div>
          <div className="text-xs text-gray-500">Retried</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-400">{QUEUES.reduce((a,q) => a + (stats[q]?.dead||0), 0)}</div>
          <div className="text-xs text-gray-500">Dead Letter</div>
        </div>
      </div>

      {/* Per queue */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {QUEUES.map(q => {
          const s = stats[q] || {};
          const healthy = s.failed === 0 && s.dead === 0;
          return (
            <div key={q} className={`bg-[#1a1a1a] border rounded-xl p-4 ${healthy ? 'border-[#2a2a2a]' : 'border-red-500/30'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-medium capitalize">{q.replace('_',' ')}</span>
                {healthy
                  ? <CheckCircle size={14} className="text-emerald-400" />
                  : <AlertTriangle size={14} className="text-red-400" />
                }
              </div>
              <div className="space-y-1 text-xs">
                {['active','delayed','failed','retried','dead'].map(field => (
                  <div key={field} className="flex justify-between">
                    <span className="text-gray-500 capitalize">{field}</span>
                    <span className={`font-medium ${field === 'failed' || field === 'dead' ? 'text-red-400' : field === 'active' ? 'text-blue-400' : 'text-gray-300'}`}>
                      {s[field] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Failed jobs */}
      {failed.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-white mb-3">Recent Failed Jobs</h3>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  {['Workflow','Error','Time'].map(h => <th key={h} className="text-left px-4 py-2 text-gray-400">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {failed.map(f => (
                  <tr key={f.id} className="border-b border-[#1e1e1e]">
                    <td className="px-4 py-2 text-gray-300">{f.workflow_id}</td>
                    <td className="px-4 py-2 text-red-400">{f.error || '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{new Date(f.ran_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
