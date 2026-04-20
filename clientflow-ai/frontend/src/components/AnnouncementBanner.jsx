import { useState, useEffect } from 'react';
import { X, Info, AlertTriangle, CheckCircle2, AlertCircle, Wrench } from 'lucide-react';
import api from '../utils/api';

const USER_ID = 'demo-user';

const TYPE_CONFIG = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  success: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  maintenance: { icon: Wrench, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);

  async function load() {
    try {
      const r = await api.get(`/announcements?user_id=${USER_ID}`);
      setAnnouncements(r.data.filter(a => !a.dismissed));
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function dismiss(id) {
    try {
      await api.post(`/announcements/${id}/dismiss`, { user_id: USER_ID });
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch {}
  }

  if (announcements.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {announcements.map(ann => {
        const cfg = TYPE_CONFIG[ann.type] || TYPE_CONFIG.info;
        const Icon = cfg.icon;
        return (
          <div key={ann.id} className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.bg}`}>
            <Icon size={16} className={`${cfg.color} shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${cfg.color}`}>{ann.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">{ann.body}</div>
            </div>
            <button onClick={() => dismiss(ann.id)} className="text-gray-500 hover:text-white transition-colors shrink-0">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
