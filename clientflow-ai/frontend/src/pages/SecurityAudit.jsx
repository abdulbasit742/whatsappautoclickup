import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Key, Lock, Eye } from 'lucide-react';
import api from '../utils/api';

const EVENT_TYPES = ['failed_login','permission_change','api_key_change','suspicious_activity'];
const ET_ICONS = { failed_login: '🔐', permission_change: '🛡️', api_key_change: '🔑', suspicious_activity: '⚠️' };

export default function SecurityAudit() {
  const [events, setEvents]   = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');

  const load = async () => {
    const q = filter ? `?event_type=${filter}` : '';
    const [ev, sum] = await Promise.all([
      api.get(`/security-audit${q}`).then(r => r.data),
      api.get('/security-audit/summary').then(r => r.data),
    ]);
    setEvents(ev);
    setSummary(sum);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, [filter]);

  if (loading) return <div className="text-gray-400">Loading security audit...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Shield size={22} className="text-red-400" />
        <h2 className="text-xl font-bold text-white">Security Audit Dashboard</h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {EVENT_TYPES.map(et => {
          const s = summary.find(x => x.event_type === et);
          return (
            <div key={et} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{ET_ICONS[et]}</div>
              <div className="text-2xl font-bold text-white">{s?.count || 0}</div>
              <div className="text-xs text-gray-500 capitalize">{et.replace(/_/g,' ')}</div>
              <div className="text-xs text-gray-600">(Last 7 days)</div>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilter('')} className={`text-xs px-3 py-1.5 rounded-lg ${!filter ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>All Events</button>
        {EVENT_TYPES.map(et => (
          <button key={et} onClick={() => setFilter(et)} className={`text-xs px-3 py-1.5 rounded-lg capitalize ${filter === et ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
            {et.replace(/_/g,' ')}
          </button>
        ))}
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              {['Event','User','IP','Time'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map(e => (
              <tr key={e.id} className="border-b border-[#1e1e1e] hover:bg-[#222]">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-1.5 capitalize">
                    <span>{ET_ICONS[e.event_type] || '📋'}</span>
                    <span className={`${e.event_type === 'failed_login' ? 'text-red-400' : e.event_type === 'suspicious_activity' ? 'text-orange-400' : 'text-gray-300'}`}>
                      {e.event_type?.replace(/_/g,' ')}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-400">{e.user_name || e.user_email || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500">{e.ip_address || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500">{new Date(e.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && <div className="text-center text-gray-500 py-8">No security events.</div>}
      </div>
    </div>
  );
}
