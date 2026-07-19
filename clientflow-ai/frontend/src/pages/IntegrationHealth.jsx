import { useEffect, useState } from 'react';
import { Activity, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import api from '../utils/api';

const INTEGRATIONS = ['groq','gmail','calendar','clickup','make'];
const INT_ICONS    = { groq: '🤖', gmail: '📧', calendar: '📅', clickup: '✅', make: '⚙️' };

export default function IntegrationHealth() {
  const [health, setHealth]   = useState({});
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');

  const check = async () => {
    setLoading(true);
    const r = await api.get('/integration-health');
    setHealth(r.data);
    setLoading(false);
  };

  const loadLogs = async (integration) => {
    const q = integration ? `?integration=${integration}` : '';
    const r = await api.get(`/integration-health/logs${q}`);
    setLogs(r.data);
  };

  useEffect(() => {
    check().then(() => loadLogs(''));
  }, []);

  useEffect(() => { loadLogs(selected); }, [selected]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Activity size={20} className="text-emerald-400" /> Integration Health</h2>
        <button onClick={check} className="text-sm bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white px-4 py-2 rounded-xl">
          🔄 Refresh
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {INTEGRATIONS.map(int => {
          const h = health[int];
          const ok = h?.status === 'ok';
          const nc = h?.status === 'not_configured';
          return (
            <div key={int} className={`bg-[#1a1a1a] border rounded-xl p-4 text-center ${ok ? 'border-emerald-500/30' : nc ? 'border-[#2a2a2a]' : 'border-red-500/30'}`}>
              <div className="text-2xl mb-2">{INT_ICONS[int]}</div>
              <div className="text-sm text-white capitalize font-medium">{int}</div>
              {loading ? (
                <div className="text-xs text-gray-500 mt-1">Checking...</div>
              ) : (
                <>
                  <div className={`text-xs mt-1 font-medium ${ok ? 'text-emerald-400' : nc ? 'text-gray-500' : 'text-red-400'}`}>
                    {ok ? '● Online' : nc ? '○ Not Configured' : '● Error'}
                  </div>
                  {h?.latency_ms != null && <div className="text-xs text-gray-600 mt-0.5">{h.latency_ms}ms</div>}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Log filter */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setSelected('')} className={`text-xs px-3 py-1.5 rounded-lg ${!selected ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>All</button>
        {INTEGRATIONS.map(i => (
          <button key={i} onClick={() => setSelected(i)} className={`text-xs px-3 py-1.5 rounded-lg capitalize ${selected === i ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>{i}</button>
        ))}
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              {['Integration','Status','Latency','Error','Time'].map(h => (
                <th key={h} className="text-left px-4 py-2 text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.slice(0,50).map(l => (
              <tr key={l.id} className="border-b border-[#1e1e1e]">
                <td className="px-4 py-2 text-white capitalize">{l.integration}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs ${l.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {l.status === 'ok' ? '✓ OK' : '✗ Error'}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-400">{l.latency_ms ? `${l.latency_ms}ms` : '—'}</td>
                <td className="px-4 py-2 text-red-400 truncate max-w-xs">{l.error_message || '—'}</td>
                <td className="px-4 py-2 text-gray-500">{new Date(l.checked_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <div className="text-center text-gray-500 py-8">No health logs yet.</div>}
      </div>
    </div>
  );
}
