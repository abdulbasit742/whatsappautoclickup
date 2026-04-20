import { useState, useEffect } from 'react';
import { Activity, TrendingDown, AlertTriangle, Heart, RefreshCw } from 'lucide-react';
import api from '../utils/api';

const ORG_ID = 'demo-org';

const LABEL_CONFIG = {
  healthy: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: Heart },
  at_risk: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: AlertTriangle },
  critical: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: TrendingDown },
};

const RISK_COLORS = { low: 'text-emerald-400', at_risk: 'text-yellow-400', critical: 'text-red-400' };

function ScoreBar({ label, value }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400 capitalize">{label.replace('_',' ')}</span>
        <span className="text-white font-medium">{value}</span>
      </div>
      <div className="w-full bg-[#2a2a2a] rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function HealthScore() {
  const [score, setScore] = useState(null);
  const [churn, setChurn] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        api.get(`/health/${ORG_ID}`).then(r => r.data),
        api.get(`/health/${ORG_ID}/churn-risk`).then(r => r.data),
      ]);
      setScore(s);
      setChurn(c);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const labelCfg = score ? LABEL_CONFIG[score.label] : null;
  const LabelIcon = labelCfg?.icon;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Customer Health Score</h1>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] text-white text-sm rounded-lg transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Recalculate
        </button>
      </div>

      {score && (
        <>
          {/* Main score */}
          <div className={`border rounded-xl p-6 ${labelCfg?.bg}`}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <svg className="w-24 h-24 -rotate-90">
                  <circle cx="48" cy="48" r="38" stroke="#2a2a2a" strokeWidth="8" fill="none"/>
                  <circle cx="48" cy="48" r="38" strokeWidth="8" fill="none"
                    stroke={score.label==='healthy'?'#10b981':score.label==='at_risk'?'#f59e0b':'#ef4444'}
                    strokeDasharray={`${(score.total_score/100)*239} 239`} strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white">{score.total_score}</span>
                  <span className="text-xs text-gray-400">/100</span>
                </div>
              </div>
              <div>
                <div className={`text-2xl font-bold capitalize ${labelCfg?.color}`}>
                  {score.label.replace('_',' ')}
                </div>
                <div className="text-gray-400 text-sm mt-1">Overall health score</div>
                {LabelIcon && <div className="flex items-center gap-1 mt-2"><LabelIcon size={14} className={labelCfg?.color} /></div>}
              </div>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 space-y-4">
            <h2 className="text-white font-semibold text-sm">Score Breakdown</h2>
            <ScoreBar label="Activity" value={score.activity_score} />
            <ScoreBar label="Reply Rate" value={score.reply_rate_score} />
            <ScoreBar label="Payment Status" value={score.payment_score} />
            <ScoreBar label="Issue Resolution" value={score.issue_score} />
            <ScoreBar label="Usage Level" value={score.usage_score} />
          </div>
        </>
      )}

      {/* Churn risk */}
      {churn && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <TrendingDown size={16} /> Churn Risk Analysis
            </h2>
            <span className={`text-sm font-bold capitalize ${RISK_COLORS[churn.risk_level]}`}>
              {churn.risk_level.replace('_',' ')} Risk
            </span>
          </div>
          {churn.factors.length === 0 ? (
            <p className="text-sm text-emerald-400 flex items-center gap-2"><Heart size={14}/>No churn risk factors detected.</p>
          ) : (
            <div className="space-y-2">
              {churn.factors.map(f => (
                <div key={f.factor} className="flex items-start gap-3 p-3 bg-[#222] rounded-lg">
                  <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm text-white font-medium capitalize">{f.factor.replace(/_/g,' ')}</div>
                    <div className="text-xs text-gray-400">{f.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && !score && (
        <div className="text-center py-12 text-gray-400 text-sm">Calculating health score...</div>
      )}
    </div>
  );
}
