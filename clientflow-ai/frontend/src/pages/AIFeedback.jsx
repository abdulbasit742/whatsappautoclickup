import { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, RefreshCw, MessageSquare } from 'lucide-react';
import api from '../utils/api';

export default function AIFeedback() {
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats]       = useState([]);
  const [loading, setLoading]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [f, s] = await Promise.all([
        api.get('/ai-feedback'),
        api.get('/ai-feedback/stats'),
      ]);
      setFeedback(f.data);
      setStats(s.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const totalUp   = stats.reduce((a, s) => a + Number(s.thumbs_up || 0), 0);
  const totalDown = stats.reduce((a, s) => a + Number(s.thumbs_down || 0), 0);
  const totalAll  = stats.reduce((a, s) => a + Number(s.total || 0), 0);
  const satisfactionPct = totalAll > 0 ? Math.round((totalUp / totalAll) * 100) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare size={20} className="text-emerald-400" />
          <h2 className="text-xl font-bold text-white">AI Feedback</h2>
        </div>
        <button onClick={load}><RefreshCw size={14} className="text-gray-500 hover:text-gray-300" /></button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">{totalAll}</div>
          <div className="text-xs text-gray-500">Total Feedback</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ThumbsUp size={16} className="text-emerald-400" />
            <span className="text-2xl font-bold text-emerald-400">{totalUp}</span>
          </div>
          <div className="text-xs text-gray-500">Thumbs Up</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ThumbsDown size={16} className="text-red-400" />
            <span className="text-2xl font-bold text-red-400">{totalDown}</span>
          </div>
          <div className="text-xs text-gray-500">Thumbs Down</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">
            {satisfactionPct !== null ? `${satisfactionPct}%` : '—'}
          </div>
          <div className="text-xs text-gray-500">Satisfaction</div>
        </div>
      </div>

      {/* By provider */}
      {stats.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Feedback by AI Provider</h3>
          <div className="space-y-3">
            {stats.map(s => {
              const pct = s.total > 0 ? Math.round((s.thumbs_up / s.total) * 100) : 0;
              return (
                <div key={s.provider}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-300 capitalize">{s.provider}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 flex items-center gap-1"><ThumbsUp size={11} />{s.thumbs_up}</span>
                      <span className="text-red-400 flex items-center gap-1"><ThumbsDown size={11} />{s.thumbs_down}</span>
                      <span className="text-gray-500 text-xs">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feedback list */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Recent Feedback</h3>
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : feedback.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500">No feedback yet</div>
        ) : (
          <div className="space-y-3">
            {feedback.map(f => (
              <div key={f.id} className={`bg-[#1a1a1a] border rounded-xl p-4 ${f.rating === 1 ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`p-1.5 rounded-lg ${f.rating === 1 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                        {f.rating === 1
                          ? <ThumbsUp size={14} className="text-emerald-400" />
                          : <ThumbsDown size={14} className="text-red-400" />
                        }
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{f.provider}</span>
                      <span className="text-xs text-gray-600">{new Date(f.created_at).toLocaleString()}</span>
                    </div>
                    {f.prompt && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-0.5">Prompt</p>
                        <p className="text-xs text-gray-400 line-clamp-1">{f.prompt}</p>
                      </div>
                    )}
                    {f.response && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-0.5">AI Response</p>
                        <p className="text-xs text-gray-300 line-clamp-2">{f.response}</p>
                      </div>
                    )}
                    {f.comment && (
                      <div className={`text-xs p-2 rounded-lg ${f.rating === 1 ? 'bg-emerald-500/5 text-emerald-300' : 'bg-red-500/5 text-red-300'}`}>
                        {f.comment}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
