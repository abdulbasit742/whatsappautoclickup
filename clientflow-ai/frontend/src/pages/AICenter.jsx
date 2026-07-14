import { useEffect, useState } from 'react';
import { Bot, Activity, AlertTriangle, Clock3 } from 'lucide-react';
import api from '../utils/api';

export default function AICenter() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/analytics/ai-center').then(r => setData(r.data)).catch(() => setData(null));
  }, []);

  if (!data) return <div className="text-gray-400">Loading AI Center...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">AI Center</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card icon={Bot} label="Total AI Requests" value={data.totalRequests} />
        <Card icon={Activity} label="Today Requests" value={data.todayRequests} />
        <Card icon={Clock3} label="Avg Latency" value={`${data.avgLatencyMs} ms`} />
        <Card icon={AlertTriangle} label="Failed Calls" value={data.failedRequests} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Provider Usage</h3>
          <div className="space-y-2">
            {data.byProvider.map(p => (
              <div key={p.provider} className="flex justify-between text-sm">
                <span className="capitalize text-gray-300">{p.provider}</span>
                <span className="text-emerald-400">{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Recent AI Logs</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {data.recentLogs.map((log, idx) => (
              <div key={idx} className="text-xs border border-[#2a2a2a] rounded-lg p-2">
                <div className="flex justify-between">
                  <span className="capitalize text-gray-300">{log.provider}</span>
                  <span className={log.success ? 'text-emerald-400' : 'text-red-400'}>{log.success ? 'ok' : 'failed'}</span>
                </div>
                {log.error_message && <p className="text-red-300 mt-1 truncate">{log.error_message}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{label}</p>
        <Icon size={14} className="text-emerald-400" />
      </div>
      <p className="text-lg font-semibold mt-2">{value ?? 0}</p>
    </div>
  );
}
