// frontend/src/pages/SocialAnalytics.jsx
// Social Media Analytics Dashboard
// Prompt 156

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { MessageSquare, MessageCircle, BarChart2, RefreshCw, TrendingUp, ThumbsUp } from 'lucide-react';
import api from '../utils/api';
import StatCard from '../components/StatCard';

const COLORS       = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];
const CHART_STYLE  = {
  contentStyle: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 },
};

export default function SocialAnalytics() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]       = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/social/analytics');
      setData(res);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500 text-sm">Loading analytics...</div>
  );

  const totalReceived = (data?.messages || []).reduce((s, r) => s + parseInt(r.received || 0), 0);
  const totalSent     = (data?.messages || []).reduce((s, r) => s + parseInt(r.sent     || 0), 0);
  const totalComments = (data?.comments || []).reduce((s, r) => s + parseInt(r.total    || 0), 0);
  const repliedComments = (data?.comments || []).reduce((s, r) => s + parseInt(r.replied || 0), 0);

  // Messages by platform
  const msgData = (data?.messages || []).map(m => ({
    platform:  m.platform,
    received:  parseInt(m.received),
    sent:      parseInt(m.sent),
    unread:    parseInt(m.unread || 0),
  }));

  // Comments by platform
  const commentData = (data?.comments || []).map(c => ({
    platform: c.platform,
    total:    parseInt(c.total),
    replied:  parseInt(c.replied),
    pending:  parseInt(c.total) - parseInt(c.replied),
  }));

  // Posts by status
  const postStatusMap = {};
  for (const p of (data?.posts || [])) {
    const key = p.status;
    if (!postStatusMap[key]) postStatusMap[key] = { status: key };
    postStatusMap[key][p.platform] = (postStatusMap[key][p.platform] || 0) + parseInt(p.count || 0);
  }
  const postData = Object.values(postStatusMap);

  // Accounts summary
  const accData = (data?.accounts || []).map(a => ({
    name:   a.platform,
    value:  parseInt(a.count),
    active: parseInt(a.active),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Social Analytics</h2>
        <button onClick={load} className="flex items-center gap-2 text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg text-sm transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {msg && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm">
          {msg} <button onClick={() => setMsg('')} className="ml-2 opacity-60">×</button>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Messages Received" value={totalReceived}  icon={MessageSquare} color="blue"   />
        <StatCard title="Replies Sent"       value={totalSent}      icon={TrendingUp}    color="emerald" />
        <StatCard title="Comments"           value={totalComments}  icon={MessageCircle} color="purple" />
        <StatCard title="Comment Reply Rate" value={`${data?.commentReplyRate || 0}%`} icon={ThumbsUp} color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Messages by Platform */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Messages by Platform</h3>
          {msgData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">No message data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={msgData}>
                <XAxis dataKey="platform" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip {...CHART_STYLE} />
                <Bar dataKey="received" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Received" />
                <Bar dataKey="sent"     fill="#10b981" radius={[4, 4, 0, 0]} name="Sent" />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Received</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Sent</span>
          </div>
        </div>

        {/* Comment Status */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Comments by Platform</h3>
          {commentData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">No comment data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={commentData}>
                <XAxis dataKey="platform" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip {...CHART_STYLE} />
                <Bar dataKey="replied" fill="#10b981" radius={[4, 4, 0, 0]} name="Replied" />
                <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Replied</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Pending</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Posts by Status */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Posts by Status</h3>
          {postData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">No posts yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={postData}>
                <XAxis dataKey="status" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip {...CHART_STYLE} />
                <Bar dataKey="facebook"  fill="#3b82f6" radius={[4, 4, 0, 0]} name="Facebook" />
                <Bar dataKey="instagram" fill="#ec4899" radius={[4, 4, 0, 0]} name="Instagram" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Connected Accounts */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Connected Accounts</h3>
          {accData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">No accounts connected</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={accData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                    label={e => `${e.name}: ${e.value}`}>
                    {accData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...CHART_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {accData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {d.name} ({d.active} active / {d.value} total)
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Meta Insights (if available) */}
      {data?.insights?.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-emerald-400" /> Meta Page Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.insights.map(insight => (
              <div key={insight.accountId} className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${insight.platform === 'facebook' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'}`}>
                    {insight.platform}
                  </span>
                  <span className="text-xs font-medium text-white truncate">{insight.name}</span>
                </div>
                <div className="space-y-1">
                  {(insight.metrics || []).slice(0, 4).map(metric => (
                    <div key={metric.id || metric.name} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 truncate">{metric.name}</span>
                      <span className="text-gray-300 ml-2">
                        {metric.values?.[metric.values.length - 1]?.value ?? '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
