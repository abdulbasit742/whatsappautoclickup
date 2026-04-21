import { useEffect, useState } from 'react';
import { Plus, ThumbsUp, MessageSquare, Pencil, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';

const STATUS_COLORS = {
  submitted:   'bg-gray-500/20 text-gray-400',
  planned:     'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-yellow-500/20 text-yellow-400',
  shipped:     'bg-emerald-500/20 text-emerald-400',
  rejected:    'bg-red-500/20 text-red-400',
};

const emptyForm = { title: '', description: '', submitted_by: '' };

export default function RoadmapVoting() {
  const [items, setItems]     = useState([]);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(emptyForm);
  const [filter, setFilter]   = useState('all');
  const [comments, setComments]     = useState({});
  const [showComments, setShowComments] = useState(null);
  const [newComment, setNewComment]   = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/roadmap').then(r => setItems(r.data));

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const create = async () => {
    if (!form.title.trim()) return alert('Title required');
    try {
      const r = await api.post('/roadmap', form);
      setItems(i => [r.data, ...i]);
      setForm(emptyForm); setModal(false);
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const vote = async (id) => {
    try {
      const r = await api.post(`/roadmap/${id}/vote`, { voter_id: 'anonymous' });
      setItems(i => i.map(x => x.id === id ? { ...x, votes: r.data.votes } : x));
    } catch (e) { /* ignore */ }
  };

  const setStatus = async (id, status) => {
    const r = await api.put(`/roadmap/${id}/status`, { status });
    setItems(i => i.map(x => x.id === id ? r.data : x));
  };

  const del = async (id) => {
    if (!confirm('Delete this item?')) return;
    await api.delete(`/roadmap/${id}`);
    setItems(i => i.filter(x => x.id !== id));
  };

  const loadComments = async (id) => {
    if (showComments === id) { setShowComments(null); return; }
    const r = await api.get(`/roadmap/${id}/comments`);
    setComments(c => ({ ...c, [id]: r.data }));
    setShowComments(id);
  };

  const addComment = async (id) => {
    if (!newComment.trim()) return;
    const r = await api.post(`/roadmap/${id}/comment`, { content: newComment, author: 'Admin' });
    setComments(c => ({ ...c, [id]: [...(c[id] || []), r.data] }));
    setNewComment('');
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  if (loading) return <div className="text-gray-400">Loading roadmap...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Roadmap & Feature Voting</h2>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Request Feature
        </button>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'submitted', 'planned', 'in_progress', 'shipped', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors capitalize ${filter === f ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400'}`}>
            {f.replace(/_/g, ' ')} {f === 'all' ? `(${items.length})` : `(${items.filter(i => i.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500">No feature requests.</div>
        )}
        {filtered.map(item => (
          <div key={item.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-start gap-4">
              {/* Vote button */}
              <button onClick={() => vote(item.id)}
                className="flex flex-col items-center gap-0.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-3 py-2 hover:border-emerald-500/40 shrink-0 transition-colors">
                <ThumbsUp size={14} className="text-emerald-400" />
                <span className="text-xs font-bold text-white">{item.votes || 0}</span>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-white">{item.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[item.status] || STATUS_COLORS.submitted}`}>
                    {item.status?.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-2">{item.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {item.submitted_by && <span>by {item.submitted_by}</span>}
                  <span>{format(new Date(item.created_at), 'dd MMM yyyy')}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => loadComments(item.id)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] px-2 py-1 rounded-lg">
                  <MessageSquare size={11} /> {item.comments || 0}
                </button>
                <select
                  value={item.status}
                  onChange={e => setStatus(item.id, e.target.value)}
                  className="text-xs bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2 py-1 text-gray-400 focus:outline-none"
                >
                  <option value="submitted">Submitted</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="shipped">Shipped</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button onClick={() => del(item.id)} className="text-xs text-red-400 hover:text-red-300 border border-red-400/20 px-2 py-1 rounded-lg">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>

            {/* Comments */}
            {showComments === item.id && (
              <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                <div className="space-y-2 mb-3">
                  {(comments[item.id] || []).map(c => (
                    <div key={c.id} className="bg-[#0f0f0f] rounded-lg p-2 text-xs">
                      <span className="text-gray-400 font-medium">{c.author}: </span>
                      <span className="text-gray-200">{c.content}</span>
                    </div>
                  ))}
                  {(comments[item.id] || []).length === 0 && <p className="text-xs text-gray-500">No comments yet.</p>}
                </div>
                <div className="flex gap-2">
                  <input value={newComment} onChange={e => setNewComment(e.target.value)}
                    placeholder="Add comment..."
                    className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button onClick={() => addComment(item.id)} className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg">Post</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Request Feature</h3>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Dark mode support"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"/>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the feature..." rows={3}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"/>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Your Name (optional)</label>
                <input value={form.submitted_by} onChange={e => setForm(f => ({ ...f, submitted_by: e.target.value }))}
                  placeholder="Your name"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"/>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={create} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
