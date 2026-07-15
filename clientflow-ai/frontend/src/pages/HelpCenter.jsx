import { useState, useEffect } from 'react';
import { Search, BookOpen, ExternalLink, ChevronRight } from 'lucide-react';
import api from '../utils/api';

export default function HelpCenter() {
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [q, setQ] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  async function load() {
    try {
      const [cats, arts, feat] = await Promise.all([
        api.get('/help/categories').then(r => r.data),
        api.get('/help/articles').then(r => r.data),
        api.get('/help/articles?featured=true').then(r => r.data),
      ]);
      setCategories(cats);
      setArticles(arts);
      setFeatured(feat);
    } catch {}
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (q || selectedCat) {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (selectedCat) params.set('category_id', selectedCat);
      api.get(`/help/articles?${params}`).then(r => setArticles(r.data)).catch(() => {});
    } else {
      load();
    }
  }, [q, selectedCat]);

  async function openArticle(id) {
    try {
      const r = await api.get(`/help/articles/${id}`);
      setSelectedArticle(r.data);
    } catch {}
  }

  if (selectedArticle) {
    return (
      <div className="max-w-3xl space-y-4">
        <button onClick={() => setSelectedArticle(null)} className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
          ← Back to Help Center
        </button>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <div className="text-xs text-emerald-400 mb-2">{selectedArticle.category_name}</div>
          <h1 className="text-xl font-bold text-white mb-4">{selectedArticle.title}</h1>
          <div className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">{selectedArticle.body}</div>
        </div>
        <div className="text-center">
          <p className="text-gray-500 text-sm">Was this helpful?</p>
          <div className="flex gap-3 justify-center mt-2">
            <button className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm hover:bg-emerald-500/20 transition-colors">👍 Yes</button>
            <button className="px-4 py-1.5 bg-[#2a2a2a] text-gray-400 border border-[#3a3a3a] rounded-lg text-sm hover:text-white transition-colors">👎 No</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold text-white mb-2">Help Center</h1>
        <p className="text-gray-400 mb-6">Find answers, guides, and documentation</p>
        <div className="relative max-w-xl mx-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search articles..."
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Categories */}
      {!q && categories.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setSelectedCat(null)}
            className={`p-4 rounded-xl border text-left transition-colors ${!selectedCat ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#3a3a3a]'}`}
          >
            <BookOpen size={20} className="text-emerald-400 mb-2" />
            <div className="text-white text-sm font-medium">All Articles</div>
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id === selectedCat ? null : cat.id)}
              className={`p-4 rounded-xl border text-left transition-colors ${selectedCat===cat.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#3a3a3a]'}`}
            >
              <span className="text-2xl block mb-1">{cat.icon || '📄'}</span>
              <div className="text-white text-sm font-medium">{cat.name}</div>
            </button>
          ))}
        </div>
      )}

      {/* Featured guides */}
      {!q && !selectedCat && featured.length > 0 && (
        <div>
          <h2 className="text-white font-semibold mb-3">Featured Guides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {featured.slice(0,4).map(art => (
              <button key={art.id} onClick={() => openArticle(art.id)}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-3 hover:border-[#3a3a3a] text-left transition-colors group">
                <div className="flex-1">
                  <div className="text-xs text-emerald-400 mb-1">{art.category_name}</div>
                  <div className="text-white text-sm font-medium group-hover:text-emerald-400 transition-colors">{art.title}</div>
                </div>
                <ChevronRight size={14} className="text-gray-500 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Articles list */}
      {(q || selectedCat) && (
        <div>
          <h2 className="text-white font-semibold mb-3">{q ? `Results for "${q}"` : 'Articles'} ({articles.length})</h2>
          <div className="space-y-2">
            {articles.map(art => (
              <button key={art.id} onClick={() => openArticle(art.id)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-3 hover:border-[#3a3a3a] text-left transition-colors group">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-0.5">{art.category_name}</div>
                  <div className="text-white text-sm font-medium group-hover:text-emerald-400 transition-colors">{art.title}</div>
                </div>
                <ChevronRight size={14} className="text-gray-500 shrink-0" />
              </button>
            ))}
            {articles.length === 0 && <p className="text-gray-500 text-sm py-4 text-center">No articles found.</p>}
          </div>
        </div>
      )}

      {/* Contact support CTA */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 text-center">
        <p className="text-white font-semibold mb-1">Can't find what you need?</p>
        <p className="text-gray-400 text-sm mb-4">Our support team is ready to help.</p>
        <a href="/support" className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">
          <ExternalLink size={14} /> Contact Support
        </a>
      </div>
    </div>
  );
}
