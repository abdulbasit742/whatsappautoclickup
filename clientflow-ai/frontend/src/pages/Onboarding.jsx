import { useEffect, useState } from 'react';
import { CheckCircle, Circle, ChevronRight, Rocket } from 'lucide-react';
import api from '../utils/api';

const STEP_META = {
  create_org:      { label: 'Create Organization',    desc: 'Set up your organization profile',       icon: '🏢' },
  choose_plan:     { label: 'Choose Plan',             desc: 'Select a plan that fits your team',     icon: '💳' },
  connect_ai:      { label: 'Connect AI Provider',     desc: 'Configure Groq or another AI provider', icon: '🤖' },
  import_contacts: { label: 'Import Contacts',         desc: 'Bring in your existing customers',      icon: '👥' },
  invite_team:     { label: 'Invite Team Members',     desc: 'Add your team to the platform',         icon: '🤝' },
  create_campaign: { label: 'Create First Campaign',   desc: 'Launch your first broadcast',           icon: '📣' },
  open_inbox:      { label: 'Open Inbox',              desc: 'Start managing conversations',          icon: '💬' },
};

export default function Onboarding() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading]   = useState(true);

  const load = () => api.get('/onboarding').then(r => setProgress(r.data));

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const complete = async (step) => {
    await api.post('/onboarding/complete', { step });
    await load();
  };

  const skip = async (step) => {
    await api.post('/onboarding/skip', { step });
    await load();
  };

  if (loading || !progress) return <div className="text-gray-400">Loading onboarding...</div>;

  const { steps, total, completed: done, percent } = progress;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🚀</div>
        <h2 className="text-2xl font-bold text-white">Welcome to ClientFlow AI</h2>
        <p className="text-gray-400 mt-2">Complete these steps to get the most out of your platform.</p>

        {/* Progress bar */}
        <div className="mt-4 bg-[#2a2a2a] rounded-full h-2">
          <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-sm text-gray-500 mt-2">{done}/{total} steps completed ({percent}%)</p>
      </div>

      {done === total && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center mb-8">
          <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">You're all set! 🎉</h3>
          <p className="text-gray-400 text-sm mt-1">Your platform is fully configured.</p>
        </div>
      )}

      <div className="space-y-3">
        {steps.map((step) => {
          const meta = STEP_META[step.step] || { label: step.step, desc: '', icon: '📋' };
          return (
            <div key={step.step} className={`bg-[#1a1a1a] border rounded-xl p-4 flex items-center gap-4 ${step.completed ? 'border-emerald-500/20 opacity-75' : 'border-[#2a2a2a]'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${step.completed ? 'bg-emerald-500/20' : 'bg-[#2a2a2a]'}`}>
                {step.completed ? <CheckCircle size={20} className="text-emerald-400" /> : <span>{meta.icon}</span>}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${step.completed ? 'text-gray-400 line-through' : 'text-white'}`}>{meta.label}</span>
                  {step.completed && <span className="text-xs text-emerald-400">Done</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{meta.desc}</p>
              </div>
              {!step.completed && (
                <div className="flex gap-2">
                  <button onClick={() => skip(step.step)} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1">Skip</button>
                  <button onClick={() => complete(step.step)} className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1">
                    Complete <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
