import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import { format } from 'date-fns';
import { useToast } from '../components/Toast';

const TYPE_CONFIG = {
  complaint: { label: 'Complaint', color: 'text-red-400 bg-red-500/10' },
  refund: { label: 'Refund', color: 'text-orange-400 bg-orange-500/10' },
  urgent: { label: 'Urgent', color: 'text-yellow-400 bg-yellow-500/10' },
  other: { label: 'Other', color: 'text-gray-400 bg-gray-500/10' },
};

const STATUS_CONFIG = {
  open: 'text-red-400 bg-red-500/10',
  in_progress: 'text-yellow-400 bg-yellow-500/10',
  resolved: 'text-emerald-400 bg-emerald-500/10',
};

export default function Issues() {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('');
  const { toast } = useToast();

  const load = () => {
    const params = filter ? `?status=${filter}` : '';
    Promise.all([
      api.get(`/issues${params}`),
      api.get('/issues/stats'),
    ]).then(([i, s]) => { setIssues(i.data); setStats(s.data); });
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id, status) => {
    await api.put(`/issues/${id}`, { status });
    toast('Status updated', 'success');
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle size={24} className="text-red-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Issue Tracker</h1>
            <p className="text-sm text-gray-500">Auto-detected complaints, refunds &amp; urgent cases</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Open', value: stats.open, color: 'text-red-400' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-yellow-400' },
            { label: 'Resolved', value: stats.resolved, color: 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['', 'open', 'in_progress', 'resolved'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]'}`}
          >
            {s === '' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Issues Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              {['Type', 'Client', 'Keyword', 'Message', 'Status', 'Date', 'Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {issues.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No issues found 🎉</td></tr>
            )}
            {issues.map(issue => (
              <tr key={issue.id} className="border-b border-[#2a2a2a] hover:bg-white/5">
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_CONFIG[issue.type]?.color || 'text-gray-400'}`}>
                    {TYPE_CONFIG[issue.type]?.label || issue.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300">{issue.client_name || '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs font-mono">{issue.keyword}</td>
                <td className="px-4 py-3 text-gray-300 max-w-xs truncate text-xs">{issue.message}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[issue.status]}`}>
                    {issue.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(issue.created_at), 'dd MMM HH:mm')}</td>
                <td className="px-4 py-3">
                  <select
                    value={issue.status}
                    onChange={e => updateStatus(issue.id, e.target.value)}
                    className="bg-[#0f0f0f] border border-[#2a2a2a] text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
