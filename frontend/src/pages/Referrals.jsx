import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import api from '../utils/api';

export default function Referrals() {
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    api.get('/referrals/leaderboard').then(r => setLeaderboard(r.data));
  }, []);

  const sendReward = async (id) => {
    await api.post(`/referrals/${id}/reward`);
    alert('Reward message sent!');
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-white">Referral Leaderboard</h2>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              <th className="px-4 py-3 text-left text-gray-400 font-medium">#</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Client</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">WhatsApp</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Referral Code</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Referrals</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No referrals yet</td></tr>
            )}
            {leaderboard.map((c, i) => (
              <tr key={i} className="border-b border-[#1a1a1a] hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-gray-400">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </td>
                <td className="px-4 py-3 text-white font-medium">{c.name || '—'}</td>
                <td className="px-4 py-3 text-gray-300">{c.whatsapp_number}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs bg-[#2a2a2a] px-2 py-1 rounded text-emerald-400">{c.referral_code}</span>
                </td>
                <td className="px-4 py-3 text-gray-300">{c.referral_count}</td>
                <td className="px-4 py-3">
                  {c.referral_count > 0 && (
                    <button
                      onClick={() => sendReward(c.id)}
                      className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300"
                    >
                      <Gift size={12} /> Send Reward
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
