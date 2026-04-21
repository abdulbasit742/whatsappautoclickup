import { useEffect, useState } from 'react';
import { Plus, DollarSign, Link, X } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';

const emptyForm = { name: '', email: '', phone: '' };

export default function Affiliates() {
  const [affiliates, setAffiliates] = useState([]);
  const [summary, setSummary]       = useState({});
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [selected, setSelected]     = useState(null);
  const [detail, setDetail]         = useState(null);
  const [loading, setLoading]       = useState(true);

  const load = () => Promise.all([
    api.get('/affiliates').then(r => setAffiliates(r.data)),
    api.get('/affiliates/analytics/summary').then(r => setSummary(r.data)),
  ]);

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const create = async () => {
    if (!form.name.trim()) return alert('Name required');
    try {
      const r = await api.post('/affiliates', form);
      setAffiliates(a => [r.data, ...a]);
      setForm(emptyForm); setModal(false);
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const viewDetail = async (id) => {
    setSelected(id);
    const r = await api.get(`/affiliates/${id}`);
    setDetail(r.data);
  };

  const payout = async (id) => {
    if (!confirm('Mark all pending commission as paid?')) return;
    await api.put(`/affiliates/${id}/payout`);
    load();
  };

  if (loading) return <div className="text-gray-400">Loading affiliates...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Affiliate Program</h2>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Add Affiliate
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Affiliates',   value: summary.total_affiliates   || 0, color: 'text-white' },
          { label: 'Active (30d)',        value: summary.active_this_month  || 0, color: 'text-emerald-400' },
          { label: 'Total Commission',   value: `PKR ${Number(summary.total_commission || 0).toLocaleString()}`, color: 'text-yellow-400' },
          { label: 'Pending Payout',     value: `PKR ${Number(summary.pending_payout || 0).toLocaleString()}`,   color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-[#2a2a2a] bg-[#111]">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-right px-4 py-3">Referrals</th>
                <th className="text-right px-4 py-3">Commission</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-500">No affiliates yet.</td></tr>}
              {affiliates.map(a => (
                <tr key={a.id} className="border-b border-[#1f1f1f] hover:bg-[#222]">
                  <td className="px-4 py-3 text-white font-medium">{a.name}</td>
                  <td className="px-4 py-3 text-gray-400">{a.email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-[#0f0f0f] border border-[#2a2a2a] px-2 py-0.5 rounded text-emerald-400">{a.referral_code}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-white">{a.referral_count || 0}</td>
                  <td className="px-4 py-3 text-right text-yellow-400">PKR {Number(a.total_commission || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => viewDetail(a.id)} className="text-xs text-blue-400 hover:text-blue-300 border border-blue-400/20 px-2 py-1 rounded-lg">View</button>
                      <button onClick={() => payout(a.id)} className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-400/20 px-2 py-1 rounded-lg">Payout</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">New Affiliate</h3>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <div className="space-y-3">
              {[['name','Name','John Doe'],['email','Email','john@example.com'],['phone','Phone','+92 300 0000000']].map(([k,l,ph]) => (
                <div key={k}>
                  <label className="block text-xs text-gray-400 mb-1">{l}</label>
                  <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    placeholder={ph}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"/>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={create} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
