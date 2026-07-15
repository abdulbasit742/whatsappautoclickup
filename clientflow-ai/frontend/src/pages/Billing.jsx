import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useToast } from '../components/Toast';
import api from '../utils/api';

const ORG_ID = 'demo-org';

export default function Billing() {
  const { showToast } = useToast();
  const [trial, setTrial] = useState(null);
  const [plans, setPlans] = useState([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [cycle, setCycle] = useState('monthly');
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const [t, p] = await Promise.all([
        api.get(`/billing/${ORG_ID}/trial`).then(r => r.data).catch(() => null),
        api.get('/billing/plans').then(r => r.data),
      ]);
      setTrial(t);
      setPlans(p);
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function upgrade() {
    if (!selectedPlan) return showToast('Select a plan', 'error');
    setLoading(true);
    try {
      await api.post(`/billing/${ORG_ID}/upgrade`, { plan_id: selectedPlan.id, billing_cycle: cycle });
      showToast(`Upgraded to ${selectedPlan.name}!`, 'success');
      setShowUpgrade(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Upgrade failed', 'error');
    }
    setLoading(false);
  }

  const trialColor = !trial ? '' : trial.trial_expired ? 'border-red-500/40 bg-red-500/5' : trial.trial_days_left <= 3 ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-emerald-500/40 bg-emerald-500/5';

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Billing & Plans</h1>

      {/* Trial Banner */}
      {trial && trial.is_trialing && (
        <div className={`border rounded-xl p-5 ${trialColor}`}>
          <div className="flex items-center gap-3">
            {trial.trial_expired ? <AlertTriangle className="text-red-400" size={20} /> : <Clock className="text-yellow-400" size={20} />}
            <div className="flex-1">
              <div className="text-white font-semibold">
                {trial.trial_expired ? 'Trial Expired' : `${trial.trial_days_left} days left in trial`}
              </div>
              <div className="text-sm text-gray-400 mt-0.5">
                {trial.trial_expired
                  ? 'Your free trial has ended. Upgrade to continue using all features.'
                  : `You're on the ${trial.plan_name} trial. Upgrade to keep your features after trial ends.`}
              </div>
            </div>
            <button onClick={() => setShowUpgrade(true)} className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">
              <ArrowUpRight size={14} /> Upgrade Now
            </button>
          </div>
        </div>
      )}

      {/* Current plan */}
      {trial && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">Current Plan</div>
              <div className="text-xl font-bold text-white mt-1">{trial.plan_name}</div>
              <div className={`text-sm mt-1 ${trial.status==='active'?'text-emerald-400':trial.status==='trialing'?'text-yellow-400':'text-red-400'}`}>
                {trial.status.replace('_',' ')}
              </div>
            </div>
            <button onClick={() => setShowUpgrade(true)} className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] text-white text-sm rounded-lg transition-colors">
              <RefreshCw size={14} /> Change Plan
            </button>
          </div>
        </div>
      )}

      {/* Plans grid */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-white font-bold text-xl mb-2">Choose a Plan</h2>
            <div className="flex gap-2 mb-6">
              {['monthly','yearly'].map(c => (
                <button key={c} onClick={() => setCycle(c)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${cycle===c?'bg-emerald-500 text-white':'bg-[#2a2a2a] text-gray-400 hover:text-white'}`}>
                  {c.charAt(0).toUpperCase()+c.slice(1)} {c==='yearly'&&<span className="text-xs opacity-70">Save ~17%</span>}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {plans.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p)}
                  className={`p-5 rounded-xl border cursor-pointer transition-all ${selectedPlan?.id===p.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#2a2a2a] bg-[#222] hover:border-[#3a3a3a]'}`}
                >
                  <div className="text-white font-bold text-lg">{p.name}</div>
                  <div className="text-3xl font-bold text-emerald-400 mt-2">
                    ${cycle==='yearly' ? p.price_yearly : p.price_monthly}
                    <span className="text-sm text-gray-400 font-normal">/{cycle==='yearly'?'yr':'mo'}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{p.seat_limit === -1 ? 'Unlimited' : p.seat_limit} seats</div>
                  <ul className="mt-3 space-y-1">
                    {(JSON.parse(p.features||'[]')).map(f => (
                      <li key={f} className="text-xs text-gray-400 flex items-center gap-1.5">
                        <span className="text-emerald-500">✓</span> {f.replace(/_/g,' ')}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={upgrade} disabled={loading || !selectedPlan} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {loading ? 'Processing...' : `Upgrade to ${selectedPlan?.name || '...'}`}
              </button>
              <button onClick={() => setShowUpgrade(false)} className="px-6 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white text-sm rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
