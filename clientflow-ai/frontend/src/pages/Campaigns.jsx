import { useState } from 'react';
import { Megaphone, Play, Pause, Trash2, Eye, Plus } from 'lucide-react';
import StatCard from '../components/StatCard';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';

const TABS = ['All', 'Running', 'Scheduled', 'Completed', 'Failed'];

const MOCK_CAMPAIGNS = [
  { id: 1, name: 'Summer Sale Blast',       type: 'Promotional', status: 'running',   target: 450, delivered: 423, replies: 89,  conversions: 34, rate: 94 },
  { id: 2, name: 'Re-engagement Wave',      type: 'Follow-up',   status: 'running',   target: 200, delivered: 143, replies: 34,  conversions: 12, rate: 72 },
  { id: 3, name: 'Welcome New Clients',     type: 'Welcome',     status: 'scheduled', target: 120, delivered: 0,   replies: 0,   conversions: 0,  rate: 0  },
  { id: 4, name: 'Payment Reminder',        type: 'Follow-up',   status: 'scheduled', target: 45,  delivered: 0,   replies: 0,   conversions: 0,  rate: 0  },
  { id: 5, name: 'Eid Special Offer',       type: 'Promotional', status: 'completed', target: 800, delivered: 791, replies: 213, conversions: 98, rate: 99 },
  { id: 6, name: 'Feedback Collection',     type: 'Survey',      status: 'failed',    target: 150, delivered: 12,  replies: 3,   conversions: 0,  rate: 8  },
];

const STATUS_STYLE = {
  running:   'bg-emerald-500/20 text-emerald-400',
  scheduled: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-gray-500/20 text-gray-400',
  failed:    'bg-red-500/20 text-red-400',
};

const TYPE_STYLE = {
  Promotional: 'bg-purple-500/20 text-purple-400',
  'Follow-up': 'bg-yellow-500/20 text-yellow-400',
  Welcome:     'bg-emerald-500/20 text-emerald-400',
  Survey:      'bg-blue-500/20 text-blue-400',
};

export default function Campaigns() {
  const [tab, setTab] = useState('All');
  const [campaigns, setCampaigns] = useState(MOCK_CAMPAIGNS);

  const counts = {
    Running:   campaigns.filter(c => c.status === 'running').length,
    Scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    Completed: campaigns.filter(c => c.status === 'completed').length,
    Failed:    campaigns.filter(c => c.status === 'failed').length,
  };

  const filtered = tab === 'All' ? campaigns : campaigns.filter(c => c.status === tab.toLowerCase());

  const togglePause = id => {
    setCampaigns(cs => cs.map(c =>
      c.id === id ? { ...c, status: c.status === 'running' ? 'scheduled' : 'running' } : c
    ));
  };

  const remove = id => setCampaigns(cs => cs.filter(c => c.id !== id));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Running"   value={counts.Running}   icon={Play}          color="emerald" />
        <StatCard title="Scheduled" value={counts.Scheduled} icon={Clock}         color="blue"    />
        <StatCard title="Completed" value={counts.Completed} icon={CheckCircle}   color="purple"  />
        <StatCard title="Failed"    value={counts.Failed}    icon={AlertTriangle} color="red"     />
      </div>

      {/* Header + New Campaign */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1">
          {TABS.map(t => (
            <button
              key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={15} /> New Campaign
        </button>
      </div>

      {/* Campaign Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl py-10 text-center text-gray-500 text-sm">
            No campaigns in this category
          </div>
        )}
        {filtered.map(c => (
          <div key={c.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              {/* Left: name + badges */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="text-sm font-semibold text-white">{c.name}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[c.type] || 'bg-gray-500/20 text-gray-400'}`}>
                    {c.type}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${STATUS_STYLE[c.status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-current'}`} />
                    {c.status}
                  </span>
                </div>

                {/* Stats row */}
                <div className="flex gap-6 text-xs text-gray-500 mb-3">
                  <span>Target: <span className="text-white font-medium">{c.target}</span></span>
                  <span>Delivered: <span className="text-white font-medium">{c.delivered}</span></span>
                  <span>Replies: <span className="text-white font-medium">{c.replies}</span></span>
                  <span>Conversions: <span className="text-emerald-400 font-medium">{c.conversions}</span></span>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Delivery rate</span>
                    <span className={c.rate >= 90 ? 'text-emerald-400' : c.rate >= 60 ? 'text-yellow-400' : 'text-red-400'}>
                      {c.rate}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        c.rate >= 90 ? 'bg-emerald-400' : c.rate >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${c.rate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="View">
                  <Eye size={14} />
                </button>
                {(c.status === 'running' || c.status === 'scheduled') && (
                  <button
                    onClick={() => togglePause(c.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      c.status === 'running'
                        ? 'text-yellow-400 hover:bg-yellow-500/10'
                        : 'text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                    title={c.status === 'running' ? 'Pause' : 'Resume'}
                  >
                    {c.status === 'running' ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                )}
                <button
                  onClick={() => remove(c.id)}
                  className="text-red-400/60 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
