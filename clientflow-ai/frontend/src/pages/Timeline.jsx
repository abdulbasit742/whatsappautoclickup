import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, MessageCircle, Tag, Star, AlertTriangle, DollarSign, StickyNote, TrendingUp, User } from 'lucide-react';
import api from '../utils/api';

const EVENT_ICONS = {
  contact_created:   { icon: User,          color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  tag_updated:       { icon: Tag,           color: 'text-purple-400',  bg: 'bg-purple-500/10' },
  message_sent:      { icon: MessageCircle, color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  message_received:  { icon: MessageCircle, color: 'text-cyan-400',    bg: 'bg-cyan-500/10' },
  campaign_touched:  { icon: Star,          color: 'text-yellow-400',  bg: 'bg-yellow-500/10' },
  followup_created:  { icon: Clock,         color: 'text-orange-400',  bg: 'bg-orange-500/10' },
  issue_raised:      { icon: AlertTriangle, color: 'text-red-400',     bg: 'bg-red-500/10' },
  payment_made:      { icon: DollarSign,    color: 'text-green-400',   bg: 'bg-green-500/10' },
  note_added:        { icon: StickyNote,    color: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
  ai_score_changed:  { icon: TrendingUp,    color: 'text-pink-400',    bg: 'bg-pink-500/10' },
};

const EVENT_TYPES = Object.keys(EVENT_ICONS);

export default function Timeline({ clientId: propClientId }) {
  const params = useParams();
  const id = propClientId || params.clientId;
  const [events, setEvents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');

  useEffect(() => {
    if (!id) return;
    const url = filter === 'all' ? `/timeline/${id}` : `/timeline/${id}?type=${filter}`;
    api.get(url).then(r => setEvents(r.data)).finally(() => setLoading(false));
  }, [id, filter]);

  if (!id) return <div className="text-gray-400">No client selected.</div>;
  if (loading) return <div className="text-gray-400">Loading timeline...</div>;

  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-4">Customer Timeline</h3>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap mb-6">
        {['all', ...EVENT_TYPES].map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`text-xs px-3 py-1 rounded-full capitalize ${filter === t ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]'}`}>
            {t.replace(/_/g,' ')}
          </button>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center text-gray-500 py-12">No timeline events yet.</div>
      )}

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-[#2a2a2a]" />
        <div className="space-y-4">
          {events.map((evt, idx) => {
            const cfg = EVENT_ICONS[evt.event_type] || { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-500/10' };
            const Icon = cfg.icon;
            return (
              <div key={evt.id} className="flex gap-4 relative pl-2">
                <div className={`w-6 h-6 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 z-10`}>
                  <Icon size={12} className={cfg.color} />
                </div>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium capitalize ${cfg.color}`}>{evt.event_type.replace(/_/g,' ')}</span>
                    <span className="text-xs text-gray-500">{new Date(evt.created_at).toLocaleString()}</span>
                  </div>
                  {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                    <div className="mt-1 text-xs text-gray-400">
                      {Object.entries(evt.metadata).map(([k,v]) => (
                        <span key={k} className="mr-2"><span className="text-gray-600">{k}:</span> {String(v)}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
