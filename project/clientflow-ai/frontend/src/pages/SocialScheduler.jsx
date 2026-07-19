// frontend/src/pages/SocialScheduler.jsx
// Social Media Post Scheduler — Facebook + Instagram
// Prompt 159

import { useEffect, useState } from 'react';
import { Calendar, Plus, Trash2, Send, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import api from '../utils/api';

const statusColor = (s) => ({
  draft:     'text-gray-400 bg-gray-500/10',
  scheduled: 'text-yellow-400 bg-yellow-500/10',
  published: 'text-emerald-400 bg-emerald-500/10',
  failed:    'text-red-400 bg-red-500/10',
}[s] || 'text-gray-400');

const statusIcon = (s) => ({
  draft:     <FileText size={12} />,
  scheduled: <Clock size={12} />,
  published: <CheckCircle size={12} />,
  failed:    <XCircle size={12} />,
}[s]);

export default function SocialScheduler() {
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState('');
  const [form, setForm]         = useState({
    accountId:   '',
    content:     '',
    mediaUrl:    '',
    scheduledAt: '',
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [accRes, postRes] = await Promise.all([
        api.get('/social/accounts'),
        api.get('/social/posts'),
      ]);
      setAccounts(accRes.data.filter(a => a.is_active));
      setPosts(postRes.data);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (asDraft) => {
    if (!form.accountId || !form.content) return setMsg('❌ Account and content are required');
    try {
      await api.post('/social/posts', {
        accountId:   form.accountId,
        content:     form.content,
        mediaUrl:    form.mediaUrl || undefined,
        scheduledAt: !asDraft && form.scheduledAt ? form.scheduledAt : undefined,
      });
      setForm({ accountId: '', content: '', mediaUrl: '', scheduledAt: '' });
      setMsg(`✅ Post ${asDraft ? 'saved as draft' : 'scheduled'}`);
      load();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || err.message));
    }
  };

  const publishNow = async (id) => {
    try {
      await api.post(`/social/posts/${id}/publish`);
      setMsg('✅ Post published!');
      load();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || err.message));
    }
  };

  const deletePost = async (id) => {
    if (!confirm('Delete this post?')) return;
    await api.delete(`/social/posts/${id}`);
    load();
  };

  const platformBadge = (p) => p === 'facebook'
    ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Facebook</span>
    : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400">Instagram</span>;

  const grouped = {
    scheduled: posts.filter(p => p.status === 'scheduled'),
    draft:     posts.filter(p => p.status === 'draft'),
    published: posts.filter(p => p.status === 'published'),
    failed:    posts.filter(p => p.status === 'failed'),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Social Scheduler</h2>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {Object.entries(grouped).map(([status, items]) => items.length > 0 && (
            <span key={status} className={`px-2 py-0.5 rounded-full capitalize ${statusColor(status)}`}>
              {items.length} {status}
            </span>
          ))}
        </div>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${msg.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {msg} <button onClick={() => setMsg('')} className="ml-2 opacity-60">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Post Form */}
        <div className="lg:col-span-1">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sticky top-4">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Plus size={16} className="text-emerald-400" /> Create Post
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Account *</label>
                <select
                  value={form.accountId}
                  onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select account...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.account_name} ({a.platform})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Caption / Content *</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Write your post content..."
                  rows={5}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
                <p className="text-xs text-gray-600 mt-0.5">{form.content.length} chars</p>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Media URL (optional)</label>
                <input
                  value={form.mediaUrl}
                  onChange={e => setForm(f => ({ ...f, mediaUrl: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-xs text-gray-600 mt-0.5">Required for Instagram posts</p>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1">
                  <Calendar size={11} /> Schedule Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => createPost(false)}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Clock size={14} /> Schedule
                </button>
                <button
                  onClick={() => createPost(true)}
                  className="flex-1 border border-[#2a2a2a] text-gray-400 hover:text-white py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <FileText size={14} /> Draft
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Post List */}
        <div className="lg:col-span-2 space-y-4">
          {(['scheduled', 'draft', 'published', 'failed']).map(status => (
            grouped[status].length > 0 && (
              <div key={status}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 capitalize">{status}</h3>
                <div className="space-y-2">
                  {grouped[status].map(post => (
                    <div key={post.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-medium text-white truncate">{post.account_name || post.username}</span>
                            {platformBadge(post.platform)}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 ${statusColor(post.status)}`}>
                              {statusIcon(post.status)} {post.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 line-clamp-3 mb-2">{post.content}</p>
                          {post.media_url && (
                            <a href={post.media_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline truncate block">
                              🖼 {post.media_url}
                            </a>
                          )}
                          <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-1">
                            {post.scheduled_at && (
                              <span className="flex items-center gap-1">
                                <Clock size={10} /> {new Date(post.scheduled_at).toLocaleString()}
                              </span>
                            )}
                            {post.published_at && (
                              <span className="flex items-center gap-1">
                                <CheckCircle size={10} className="text-emerald-400" />
                                Published {new Date(post.published_at).toLocaleString()}
                              </span>
                            )}
                            {post.error_message && (
                              <span className="text-red-400">{post.error_message}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {(post.status === 'draft' || post.status === 'failed') && (
                            <button
                              onClick={() => publishNow(post.id)}
                              title="Publish now"
                              className="text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors"
                            >
                              <Send size={12} /> Publish
                            </button>
                          )}
                          <button
                            onClick={() => deletePost(post.id)}
                            className="text-gray-500 hover:text-red-400 border border-[#2a2a2a] px-2 py-1 rounded-lg transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}

          {loading && <p className="text-gray-500 text-sm text-center py-8">Loading posts...</p>}
          {!loading && posts.length === 0 && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center">
              <Calendar size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No posts yet.</p>
              <p className="text-gray-600 text-xs mt-1">Create your first scheduled post using the form.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
