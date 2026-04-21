import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function Issues() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    api.get('/alerts').then(r => setAlerts(r.data)).catch(() => setAlerts([]));
  }, []);

  const resolve = async (id) => {
    await api.put(`/alerts/${id}/resolve`);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Issues & Alerts</h2>
      <div className="space-y-3">
        {alerts.length === 0 && <div className="text-gray-500 text-sm">No unresolved issues.</div>}
        {alerts.map(a => (
          <div key={a.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold capitalize">{a.type?.replace(/_/g, ' ')}</p>
                <p className="text-xs text-gray-400 mt-1">{a.message}</p>
              </div>
              <button onClick={() => resolve(a.id)} className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg">
                Resolve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
