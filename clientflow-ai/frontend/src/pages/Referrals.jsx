import { useEffect, useState } from 'react';
import { Plus, Send, Trophy, X } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';

export default function Referrals() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [rewardModal, setRewardModal] = useState(null);
  const [rewardMsg, setRewardMsg]     = useState('');
  const [sending, setSending]         = useState(false);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    api.get('/referrals/leaderboard').then(r => setLeaderboard(r.data)).finally(() => setLoading(false));
  }, []);

  const sendReward = async () => {
    if (!rewardModal) return;
    setSending(true);
    try {
      await api.post(`/referrals/${rewardModal.id}/reward`, { message: rewardMsg });
      alert('Reward sent!');
      setRewardModal(null);
      setRewardMsg('');
    } catch (e) { alert(e.response?.data?.error || e.message); }
    finally { setSending(false); }
  };

  if (loading) return <div className="text-gray-400">Loading referrals...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-white">Referral System</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total Referrers</p>
          <p className="text-2xl font-bold text-white">{leaderboard.length}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total Referrals</p>
          <p className="text-2xl font-bold text-emerald-400">
            {leaderboard.reduce((a, b) => a + parseInt(b.referral_count || 0), 0)}
          </p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Top Referrer</p>
          <p className="text-sm font-bold text-yellow-400 truncate">
            {leaderboard[0]?.name || leaderboard[0]?.whatsapp_number || '—'}
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center gap-2">
          <Trophy size={16} className="text-yellow-400" />
          <h3 className="text-sm font-semibold text-white">Referral Leaderboard</h3>
        </div>
        <div className="divide-y divide-[#1f1f1f]">
          {leaderboard.length === 0 && (
            <div className="py-8 text-center text-gray-500 text-sm">No referrals yet.</div>
          )}
          {leaderboard.map((r, i) => (
            <div key={r.id || i} className="px-5 py-3 flex items-center justify-between hover:bg-[#222]">
              <div className="flex items-center gap-4">
                <span className={`text-lg font-bold w-7 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-yellow-700' : 'text-gray-500'}`}>
                  #{i + 1}
                </span>
                <div>
                  <p className="text-sm text-white font-medium">{r.name || r.whatsapp_number}</p>
                  <p className="text-xs text-gray-500">Code: {r.referral_code || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-400">{r.referral_count}</p>
                  <p className="text-xs text-gray-500">referrals</p>
                </div>
                <button
                  onClick={() => { setRewardModal(r); setRewardMsg(''); }}
                  className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 px-3 py-1.5 rounded-lg"
                >
                  <Send size={11} /> Reward
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reward Modal */}
      {rewardModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Send Reward</h3>
              <button onClick={() => setRewardModal(null)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Sending reward to: <span className="text-white">{rewardModal.name || rewardModal.whatsapp_number}</span>
            </p>
            <textarea
              value={rewardMsg}
              onChange={e => setRewardMsg(e.target.value)}
              rows={4}
              placeholder="Custom reward message (leave blank for default)..."
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRewardModal(null)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={sendReward} disabled={sending}
                className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                <Send size={14} /> {sending ? 'Sending...' : 'Send Reward'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
