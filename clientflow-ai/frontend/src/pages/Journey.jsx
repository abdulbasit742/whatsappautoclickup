import { useEffect, useState } from 'react';
import { Map, MessageSquare, CreditCard, Calendar, Star, Link, Megaphone, Mail, HelpCircle } from 'lucide-react';
import api from '../utils/api';

const STAGE_ORDER    = ['awareness','interest','consideration','purchase','retention','loyalty'];
const STAGE_COLORS   = { awareness:'bg-gray-500', interest:'bg-blue-500', consideration:'bg-purple-500', purchase:'bg-yellow-500', retention:'bg-orange-500', loyalty:'bg-emerald-500' };
const TOUCHPOINT_ICONS = {
  whatsapp_message: <MessageSquare size={12} />,
  payment:          <CreditCard    size={12} />,
  appointment:      <Calendar      size={12} />,
  review:           <Star          size={12} />,
  referral:         <Link          size={12} />,
  broadcast_opened: <Megaphone     size={12} />,
  followup_sent:    <Mail          size={12} />,
  default:          <HelpCircle    size={12} />,
};

export default function Journey() {
  const [clientId, setClientId]   = useState('');
  const [journey, setJourney]     = useState(null);
  const [opps, setOpps]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [activeTab, setActiveTab] = useState('journey');

  const loadJourney = async id => {
    if (!id.trim()) return;
    setLoading(true);
    try {
      const [jRes, oRes] = await Promise.all([
        api.get(`/journey/${id.trim()}`),
        api.get(`/journey/client/${id.trim()}/opportunities`),
      ]);
      setJourney(jRes.data);
      setOpps(oRes.data.opportunities || []);
    } catch (e) { alert(e.response?.data?.error || 'Client not found'); }
    finally { setLoading(false); }
  };

  const addTouchpoint = async type => {
    if (!journey) return;
    await api.post('/journey/touchpoint', { clientId: journey.clientId, type, description: `Manual: ${type}` });
    loadJourney(journey.clientId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Map size={20} className="text-emerald-400" /> Customer Journey</h2>
        <div className="flex gap-2">
          {['journey', 'opportunities'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${activeTab === tab ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <input value={clientId} onChange={e => setClientId(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadJourney(clientId)}
          placeholder="Enter client ID..."
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 flex-1" />
        <button onClick={() => loadJourney(clientId)} disabled={loading || !clientId.trim()}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm">
          {loading ? '...' : 'Load Journey'}
        </button>
      </div>

      {journey && activeTab === 'journey' && (
        <div className="space-y-6">
          {/* Stage indicator */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-sm text-gray-400 mb-3">Journey Stage</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {STAGE_ORDER.map(stage => (
                <div key={stage} className={`flex-1 text-center py-2 px-3 rounded-lg text-xs font-medium min-w-24 transition-all ${
                  stage === journey.stage?.stage
                    ? `${STAGE_COLORS[stage]} text-white`
                    : STAGE_ORDER.indexOf(stage) < STAGE_ORDER.indexOf(journey.stage?.stage || '')
                    ? 'bg-[#2a2a2a] text-gray-400'
                    : 'bg-[#1f1f1f] text-gray-600'
                } capitalize`}>
                  {stage}
                </div>
              ))}
            </div>
            {journey.stage && <p className="text-xs text-gray-500 mt-2">{journey.stage.description}</p>}
          </div>

          {/* Client summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              ['Total Touchpoints', journey.summary?.totalTouchpoints || 0],
              ['Payments', journey.summary?.payments || 0],
              ['Days Active', journey.client?.first_contact_at ? Math.floor((Date.now() - new Date(journey.client.first_contact_at)) / 86400000) : 0],
            ].map(([label, val]) => (
              <div key={label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{val}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Timeline ({journey.touchpoints.length} events)</h3>
              <div className="flex gap-2">
                {['whatsapp_message','payment','appointment','review'].map(type => (
                  <button key={type} onClick={() => addTouchpoint(type)} title={`Add ${type}`}
                    className="text-xs px-2 py-1 bg-[#2a2a2a] hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 rounded transition-colors">
                    {(TOUCHPOINT_ICONS[type] || TOUCHPOINT_ICONS.default)}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[#2a2a2a]" />
              <div className="space-y-4">
                {journey.touchpoints.map(tp => (
                  <div key={tp.id} className="flex gap-3 pl-8 relative">
                    <div className="absolute left-2 top-2 w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-[8px]">
                      {TOUCHPOINT_ICONS[tp.type] || TOUCHPOINT_ICONS.default}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white capitalize">{tp.type.replace('_',' ')}</span>
                        <span className="text-xs text-gray-500">{new Date(tp.created_at).toLocaleDateString()}</span>
                      </div>
                      {tp.description && <p className="text-xs text-gray-400">{tp.description}</p>}
                    </div>
                  </div>
                ))}
                {journey.touchpoints.length === 0 && <p className="text-gray-500 text-xs pl-8">No touchpoints recorded yet</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {journey && activeTab === 'opportunities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opps.map((opp, i) => (
            <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${opp.priority === 'high' ? 'bg-red-500/20 text-red-400' : opp.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>{opp.priority}</span>
                <span className="text-xs text-gray-400 capitalize">{opp.type.replace('_',' ')}</span>
              </div>
              <p className="text-sm text-white">{opp.message}</p>
            </div>
          ))}
          {opps.length === 0 && <p className="text-gray-500 text-sm col-span-2 text-center py-8">No opportunities detected</p>}
        </div>
      )}

      {!journey && (
        <div className="text-center text-gray-500 py-16">
          <Map size={48} className="mx-auto mb-4 text-gray-700" />
          <p>Enter a client ID to view their journey map</p>
        </div>
      )}
    </div>
  );
}
