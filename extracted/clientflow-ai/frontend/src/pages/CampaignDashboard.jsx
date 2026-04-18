import { useEffect, useState } from 'react';
import { Megaphone, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import api from '../utils/api';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  sent:      { label: 'Sent', color: 'text-emerald-400 bg-emerald-500/10', icon: CheckCircle },
  scheduled: { label: 'Running', color: 'text-blue-400 bg-blue-500/10', icon: Clock },
  failed:    { label: 'Failed', color: 'text-red-400 bg-red-500/10', icon: XCircle },
  draft:     { label: 'Draft', color: 'text-gray-400 bg-gray-500/10', icon: FileText },
};

export default function CampaignDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/campaigns').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 p-6">Loading...</div>;
  if (!data) return <div className="text-red-400 p-6">Failed to load campaign data</div>;

  const { stats, recent } = data;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Megaphone size={24} className="text-blue-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Campaign Dashboard</h1>
          <p className="text-sm text-gray-500">All broadcasts &amp; campaign performance</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Completed', value: stats.completed, color: 'text-emerald-400' },
          { label: 'Running', value: stats.running, color: 'text-blue-400' },
          { label: 'Failed', value: stats.failed, color: 'text-red-400' },
          { label: 'Draft', value: stats.draft, color: 'text-gray-400' },
          { label: 'Total Sent', value: parseInt(stats.total_messages_sent).toLocaleString(), color: 'text-purple-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Campaign List */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a2a2a]">
          <h3 className="text-sm font-semibold text-white">Recent Campaigns</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              {['Campaign', 'Audience', 'Sent', 'Delivered', 'Status', 'Date'].map(h => (
                <th key={h} className="px-4 py-2 text-left text-xs text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No campaigns yet</td></tr>
            )}
            {recent.map(b => {
              const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.draft;
              return (
                <tr key={b.id} className="border-b border-[#2a2a2a] hover:bg-white/5">
                  <td className="px-4 py-3 text-white font-medium">{b.title || 'Untitled'}</td>
                  <td className="px-4 py-3 text-gray-400 capitalize text-xs">{b.target_audience}</td>
                  <td className="px-4 py-3 text-gray-300">{b.total_sent || 0}</td>
                  <td className="px-4 py-3 text-gray-300">{b.total_delivered || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(b.created_at), 'dd MMM yyyy')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
