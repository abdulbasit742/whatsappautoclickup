import { useEffect, useState } from 'react';
import api from '../utils/api';

const labels = {
  gmail: 'Gmail',
  googleCalendar: 'Google Calendar',
  clickup: 'ClickUp',
  make: 'Make.com',
  paymentGateway: 'Payment Gateway',
  groq: 'Groq',
  openai: 'OpenAI (placeholder)',
  claude: 'Claude (placeholder)',
  gemini: 'Gemini (placeholder)',
};

export default function Integrations() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    api.get('/analytics/integration-status').then(r => setStatus(r.data)).catch(() => setStatus({}));
  }, []);

  if (!status) return <div className="text-gray-400">Loading integrations...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Integrations Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.entries(labels).map(([key, label]) => (
          <div key={key} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-gray-300">{label}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${status[key] ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
              {status[key] ? 'Connected' : 'Not connected'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
