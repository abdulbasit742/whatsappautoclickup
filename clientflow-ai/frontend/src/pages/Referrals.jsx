import { useEffect, useState } from 'react';
import { Gift, Users, Trophy } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../components/Toast';

const RANK_BORDER = ['border-yellow-400', 'border-gray-300', 'border-orange-600'];
const RANK_ICONS  = ['🥇', '🥈', '🥉'];

const DEFAULT_REWARD_MSG = (name) =>
  `🎉 Congratulations ${name || '{{client_name}}'}! You've earned a reward for referring clients to us. Thank you so much for your support! 🙏`;

export default function Referrals() {
  const toast = useToast();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [rewardTarget, setRewardTarget] = useState(null);
  const [rewardMsg, setRewardMsg]       = useState('');
  const [sending, setSending]           = useState(false);

  useEffect(() => {
    api.get('/referrals/leaderboard')
      .then(r => setLeaderboard(r.data))
      .catch(() => toast('Failed to load referrals', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const openReward = c => {
    setRewardTarget(c);
    setRewardMsg(DEFAULT_REWARD_MSG(c.name));
  };

  const sendReward = async () => {
    if (!rewardTarget) return;
    setSending(true);
    try {
      await api.post(`/referrals/${rewardTarget.id}/reward`, { message: rewardMsg });
      toast('Reward sent via WhatsApp!', 'success');
      setRewardTarget(null);
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to send reward', 'error');
    } finally {
      setSending(false);
    }
  };

  const total       = leaderboard.reduce((a, c) => a + parseInt(c.referral_count || 0), 0);
  const topReferrer = leaderboard[0] || null;
  const unrewarded  = leaderboard.filter(c => parseInt(c.referral_count) > 0).length;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
        <Gift size={20} className="text-yellow-400" /> Referral Leaderboard
      </h2>

      {/* How It Works */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 mb-6">
        <p className="text-sm font-medium text-blue-300 mb-1">ℹ️ How It Works</p>
        <p className="text-xs text-gray-400">Share your referral code with your clients. When they refer someone who messages you, their code links the referral automatically.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 text-center">
          <Users size={18} className="text-emerald-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{total}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Referrals</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 text-center">
          <Trophy size={18} className="text-yellow-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-white truncate">{topReferrer ? (topReferrer.name || topReferrer.whatsapp_number) : '—'}</p>
          {topReferrer && <p className="text-xs text-yellow-400 mt-0.5">{topReferrer.referral_count} referral{topReferrer.referral_count !== '1' ? 's' : ''}</p>}
          <p className="text-xs text-gray-500 mt-0.5">Top Referrer</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 text-center">
          <Gift size={18} className="text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{unrewarded}</p>
          <p className="text-xs text-gray-500 mt-0.5">With Referrals</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-12 text-center text-gray-500">
          No referrals yet — ask your clients to spread the word! 🌟
        </div>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-xs text-gray-500">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">WhatsApp</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-center">Referrals</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((c, i) => (
                <tr key={c.id || i}
                  className={`border-b border-[#2a2a2a] hover:bg-white/5 transition-colors ${i < 3 ? `border-l-2 ${RANK_BORDER[i]}` : ''}`}>
                  <td className="px-4 py-3 text-gray-400">
                    {i < 3 ? RANK_ICONS[i] : `#${i + 1}`}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{c.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-300 hidden md:table-cell">{c.whatsapp_number}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-[#2a2a2a] px-2 py-1 rounded text-emerald-400">
                      {c.referral_code || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-white">{c.referral_count}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {parseInt(c.referral_count) > 0 && (
                      <button onClick={() => openReward(c)}
                        className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 ml-auto transition-colors">
                        <Gift size={12} /> Send Reward
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reward Modal */}
      {rewardTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-white mb-1">Send Reward</h3>
            <p className="text-xs text-gray-500 mb-5">To: {rewardTarget.name || rewardTarget.whatsapp_number}</p>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Reward Message</label>
              <textarea value={rewardMsg} onChange={e => setRewardMsg(e.target.value)} rows={4}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setRewardTarget(null)} className="flex-1 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 py-2 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={sendReward} disabled={sending}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                {sending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <Gift size={14} /> Send via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
