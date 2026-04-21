import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import api from '../utils/api';

const FEATURE_COLORS = {
  crm:          '#10b981',
  inbox:        '#3b82f6',
  campaigns:    '#f59e0b',
  ai_center:    '#8b5cf6',
  billing:      '#ef4444',
  integrations: '#06b6d4',
};

const FEATURE_LABELS = {
  crm:          'CRM',
  inbox:        'Inbox',
  campaigns:    'Campaigns',
  ai_center:    'AI Center',
  billing:      'Billing',
  integrations: 'Integrations',
};

export default function FeatureAdoption() {
  const [summary, setSummary] = useState(null);
  const [mostUsed, setMostUsed] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/feature-adoption/summary'),
      api.get('/feature-adoption/most-used'),
    ]).then(([s, m]) => {
      setSummary(s.data);
      setMostUsed(m.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Loading feature adoption...</div>;
  if (!summary) return null;

  const radarData = summary.features.map(f => ({
    feature: FEATURE_LABELS[f.feature] || f.feature,
    adoption: parseFloat(f.adoptionPct),
  }));

  const barData = mostUsed.map(f => ({
    name: FEATURE_LABELS[f.feature] || f.feature,
    uses: parseInt(f.total_uses),
    users: parseInt(f.unique_users),
    key: f.feature,
  }));

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-white">Feature Adoption Dashboard</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {summary.features.map(f => (
          <div key={f.feature} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-white">{FEATURE_LABELS[f.feature] || f.feature}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{f.adoptionPct}%</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: FEATURE_COLORS[f.feature] || '#10b981' }}>{f.adopters}</p>
            <p className="text-xs text-gray-500 mt-1">users · {f.totalUses} total uses · avg depth {f.avgDepth}</p>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${f.adoptionPct}%`, backgroundColor: FEATURE_COLORS[f.feature] || '#10b981' }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Bar chart — most used */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Most Used Features (Total Uses)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} />
              <Bar dataKey="uses" name="Total Uses" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar chart — adoption % */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Feature Adoption Radar</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2a2a2a" />
              <PolarAngleAxis dataKey="feature" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
              <Radar name="Adoption %" dataKey="adoption" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} formatter={v => `${v}%`} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Unique users per feature */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Unique Users per Feature</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} />
            <Bar dataKey="users" name="Unique Users" fill="#3b82f6" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
