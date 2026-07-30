import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Megaphone, Plus, Play, Pause, Trash2, Users, ListChecks, FlaskConical, Layers, RefreshCw } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'text-gray-400 bg-gray-400/10',
  active: 'text-emerald-400 bg-emerald-400/10',
  paused: 'text-yellow-400 bg-yellow-400/10',
  completed: 'text-blue-400 bg-blue-400/10',
};

export default function CampaignDashboard() {
  const [activeTab, setActiveTab] = useState('drip');
  const [drips, setDrips] = useState([]);
  const [lists, setLists] = useState([]);
  const [abTests, setAbTests] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showDripForm, setShowDripForm] = useState(false);
  const [showListForm, setShowListForm] = useState(false);
  const [showABForm, setShowABForm] = useState(false);
  const [dripForm, setDripForm] = useState({ name: '', list_id: '' });
  const [listForm, setListForm] = useState({ name: '', description: '' });
  const [abForm, setAbForm] = useState({ name: '', variant_a: '', variant_b: '' });
  const [selectedDrip, setSelectedDrip] = useState(null);
  const [steps, setSteps] = useState([]);
  const [stepForm, setStepForm] = useState({ step_number: 1, delay_hours: 24, message: '', template_id: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDrips();
    fetchLists();
    fetchABTests();
    api.get('/templates').then(r => setTemplates(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedDrip) fetchSteps(selectedDrip.id);
  }, [selectedDrip]);

  async function fetchDrips() { try { const r = await api.get('/campaigns/drip'); setDrips(r.data); } catch {} }
  async function fetchLists() { try { const r = await api.get('/campaigns/lists'); setLists(r.data); } catch {} }
  async function fetchABTests() { try { const r = await api.get('/campaigns/ab-tests'); setAbTests(r.data); } catch {} }
  async function fetchSteps(id) { try { const r = await api.get(`/campaigns/drip/${id}/steps`); setSteps(r.data); } catch {} }

  async function createDrip(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/campaigns/drip', dripForm); setShowDripForm(false); setDripForm({ name: '', list_id: '' }); fetchDrips(); }
    catch (err) { alert(err.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  }

  async function createList(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/campaigns/lists', listForm); setShowListForm(false); setListForm({ name: '', description: '' }); fetchLists(); }
    catch (err) { alert(err.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  }

  async function createABTest(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/campaigns/ab-tests', abForm); setShowABForm(false); setAbForm({ name: '', variant_a: '', variant_b: '' }); fetchABTests(); }
    catch (err) { alert(err.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  }

  async function addStep(e) {
    e.preventDefault();
    await api.post(`/campaigns/drip/${selectedDrip.id}/steps`, stepForm);
    setStepForm({ step_number: steps.length + 2, delay_hours: 24, message: '', template_id: '' });
    fetchSteps(selectedDrip.id);
  }

  async function deleteStep(stepId) {
    await api.delete(`/campaigns/drip/${selectedDrip.id}/steps/${stepId}`);
    fetchSteps(selectedDrip.id);
  }

  async function toggleDrip(drip) {
    const newStatus = drip.status === 'active' ? 'paused' : 'active';
    await api.patch(`/campaigns/drip/${drip.id}/status`, { status: newStatus });
    fetchDrips();
  }

  async function enrollDrip(id) {
    try {
      const r = await api.post(`/campaigns/drip/${id}/enroll`);
      alert(`Enrolled ${r.data.enrolled} contacts!`);
      fetchDrips();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Megaphone className="text-emerald-400" size={22} />
        <h1 className="text-xl font-bold">Campaign Engine</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#2a2a2a]">
        {[
          { id: 'drip', icon: Layers, label: 'Drip Campaigns' },
          { id: 'lists', icon: Users, label: 'Contact Lists' },
          { id: 'ab', icon: FlaskConical, label: 'A/B Tests' },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition -mb-px ${
              activeTab === id ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Drip Campaigns Tab */}
      {activeTab === 'drip' && (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Drip Campaigns</h3>
              <button onClick={() => setShowDripForm(true)}
                className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-black px-3 py-1.5 rounded-lg text-xs font-semibold">
                <Plus size={12} /> New
              </button>
            </div>

            {showDripForm && (
              <form onSubmit={createDrip} className="bg-[#1a1a1a] rounded-xl p-4 border border-emerald-500/30 mb-4 space-y-3">
                <input value={dripForm.name} onChange={e => setDripForm({ ...dripForm, name: e.target.value })}
                  placeholder="Campaign name" required
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm" />
                <select value={dripForm.list_id} onChange={e => setDripForm({ ...dripForm, list_id: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm">
                  <option value="">Select contact list...</option>
                  {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.member_count} contacts)</option>)}
                </select>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowDripForm(false)} className="flex-1 py-1.5 rounded-lg border border-[#333] text-sm">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black py-1.5 rounded-lg text-sm font-semibold">Create</button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {drips.map(d => (
                <div key={d.id}
                  onClick={() => setSelectedDrip(d)}
                  className={`bg-[#1a1a1a] rounded-xl p-4 border cursor-pointer hover:border-emerald-500/30 transition ${selectedDrip?.id === d.id ? 'border-emerald-500/50' : 'border-[#2a2a2a]'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">{d.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{d.list_name || 'No list'} · {d.step_count} steps · {d.enrolled_count} enrolled</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[d.status]}`}>{d.status}</span>
                      <button onClick={e => { e.stopPropagation(); toggleDrip(d); }}
                        className="p-1 hover:text-emerald-400 text-gray-500">
                        {d.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button onClick={e => { e.stopPropagation(); enrollDrip(d.id); }}
                        className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded hover:bg-blue-500/20">
                        Enroll
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!drips.length && <div className="text-gray-500 text-sm text-center py-8">No drip campaigns yet.</div>}
            </div>
          </div>

          {/* Steps Panel */}
          <div>
            {selectedDrip ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Steps: {selectedDrip.name}</h3>
                  <button onClick={() => setSelectedDrip(null)} className="text-xs text-gray-400 hover:text-white">← Back</button>
                </div>

                {/* Add step form */}
                <form onSubmit={addStep} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Step #</label>
                      <input type="number" value={stepForm.step_number} onChange={e => setStepForm({ ...stepForm, step_number: e.target.value })}
                        className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Delay (hours)</label>
                      <input type="number" value={stepForm.delay_hours} onChange={e => setStepForm({ ...stepForm, delay_hours: e.target.value })}
                        className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Template (optional)</label>
                    <select value={stepForm.template_id} onChange={e => setStepForm({ ...stepForm, template_id: e.target.value })}
                      className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm">
                      <option value="">Custom message...</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Message</label>
                    <textarea value={stepForm.message} onChange={e => setStepForm({ ...stepForm, message: e.target.value })} rows={2}
                      className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm resize-none" />
                  </div>
                  <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black py-1.5 rounded-lg text-sm font-semibold">
                    Add Step
                  </button>
                </form>

                {/* Steps list */}
                <div className="space-y-2">
                  {steps.map((s, i) => (
                    <div key={s.id} className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
                        {s.step_number}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-400">After {s.delay_hours}h · {s.template_name || 'Custom'}</div>
                        <div className="text-sm mt-1">{s.message || '—'}</div>
                      </div>
                      <button onClick={() => deleteStep(s.id)} className="text-gray-500 hover:text-red-400 p-1">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-12">Select a drip campaign to manage its steps</div>
            )}
          </div>
        </div>
      )}

      {/* Contact Lists Tab */}
      {activeTab === 'lists' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Contact Lists</h3>
            <button onClick={() => setShowListForm(true)}
              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-black px-3 py-1.5 rounded-lg text-xs font-semibold">
              <Plus size={12} /> New List
            </button>
          </div>

          {showListForm && (
            <form onSubmit={createList} className="bg-[#1a1a1a] rounded-xl p-4 border border-emerald-500/30 mb-4 grid grid-cols-2 gap-3">
              <input value={listForm.name} onChange={e => setListForm({ ...listForm, name: e.target.value })}
                placeholder="List name" required
                className="bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm" />
              <input value={listForm.description} onChange={e => setListForm({ ...listForm, description: e.target.value })}
                placeholder="Description (optional)"
                className="bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm" />
              <div className="col-span-2 flex gap-2">
                <button type="button" onClick={() => setShowListForm(false)} className="flex-1 py-1.5 rounded-lg border border-[#333] text-sm">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black py-1.5 rounded-lg text-sm font-semibold">Create</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-3 gap-4">
            {lists.map(l => (
              <div key={l.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={16} className="text-emerald-400" />
                  <span className="font-medium text-sm">{l.name}</span>
                </div>
                <div className="text-2xl font-bold text-white">{l.member_count}</div>
                <div className="text-gray-400 text-xs">contacts</div>
                {l.description && <div className="text-gray-500 text-xs mt-2">{l.description}</div>}
              </div>
            ))}
            {!lists.length && <div className="col-span-3 text-center text-gray-500 py-8">No contact lists yet.</div>}
          </div>
        </div>
      )}

      {/* A/B Tests Tab */}
      {activeTab === 'ab' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">A/B Tests</h3>
            <button onClick={() => setShowABForm(true)}
              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-black px-3 py-1.5 rounded-lg text-xs font-semibold">
              <Plus size={12} /> New A/B Test
            </button>
          </div>

          {showABForm && (
            <form onSubmit={createABTest} className="bg-[#1a1a1a] rounded-xl p-4 border border-emerald-500/30 mb-4 space-y-3">
              <input value={abForm.name} onChange={e => setAbForm({ ...abForm, name: e.target.value })}
                placeholder="Test name" required
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Variant A</label>
                  <textarea value={abForm.variant_a} onChange={e => setAbForm({ ...abForm, variant_a: e.target.value })} rows={3} required
                    className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm resize-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Variant B</label>
                  <textarea value={abForm.variant_b} onChange={e => setAbForm({ ...abForm, variant_b: e.target.value })} rows={3} required
                    className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm resize-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowABForm(false)} className="flex-1 py-1.5 rounded-lg border border-[#333] text-sm">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black py-1.5 rounded-lg text-sm font-semibold">Create</button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {abTests.map(t => (
              <div key={t.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-gray-500">Created {new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] || 'text-gray-400 bg-gray-400/10'}`}>{t.status}</span>
                    {t.winner && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400">Winner: {t.winner}</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {['a', 'b'].map(v => (
                    <div key={v} className={`rounded-lg p-3 ${t.winner === v.toUpperCase() ? 'border border-emerald-500/40 bg-emerald-500/5' : 'bg-[#252525]'}`}>
                      <div className="text-xs font-bold text-gray-400 mb-2">VARIANT {v.toUpperCase()}</div>
                      <div className="text-xs text-gray-300 mb-3">{t[`variant_${v}`]}</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><div className="text-gray-500">Sent</div><div className="font-medium">{t[`sent_${v}`]}</div></div>
                        <div><div className="text-gray-500">Opens</div><div className="font-medium">{t[`opens_${v}`]}</div></div>
                        <div><div className="text-gray-500">Replies</div><div className="font-medium">{t[`replies_${v}`]}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!abTests.length && <div className="text-center text-gray-500 py-8">No A/B tests yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
