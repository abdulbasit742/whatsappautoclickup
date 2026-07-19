import { useEffect, useState, useRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function SearchModal({ onClose }) {
  const [q, setQ]             = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const inputRef              = useRef(null);
  const navigate              = useNavigate();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (q.length < 2) { setResults({}); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const r = await api.get(`/search?q=${encodeURIComponent(q)}`).catch(() => ({ data: { results: {} } }));
      setResults(r.data.results || {});
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const go = (item) => {
    if (item.type === 'contact') navigate(`/clients/${item.id}`);
    else if (item.type === 'issue') navigate(`/issues`);
    onClose();
  };

  const allResults = Object.values(results).flat();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 pt-20 px-4" onClick={onClose}>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a]">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search contacts, issues, conversations..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
          />
          {q && <button onClick={() => setQ('')}><X size={14} className="text-gray-500" /></button>}
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xs border border-[#333] px-2 py-0.5 rounded">ESC</button>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {loading && <div className="text-center text-gray-500 py-6 text-sm">Searching...</div>}
          {!loading && q.length >= 2 && allResults.length === 0 && (
            <div className="text-center text-gray-500 py-6 text-sm">No results for "{q}"</div>
          )}
          {!loading && allResults.length > 0 && Object.entries(results).map(([type, items]) => (
            items.length > 0 && (
              <div key={type}>
                <div className="px-4 py-1 text-xs text-gray-500 font-medium capitalize">{type}</div>
                {items.map(item => (
                  <button key={item.id} onClick={() => go(item)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#222] text-left group">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{item.name || item.title}</div>
                      {item.subtitle && <div className="text-xs text-gray-500 truncate">{item.subtitle}</div>}
                    </div>
                    <ArrowRight size={12} className="text-gray-600 group-hover:text-gray-400" />
                  </button>
                ))}
              </div>
            )
          ))}
          {!q && (
            <div className="px-4 py-4 text-xs text-gray-600">Start typing to search across contacts, issues, and conversations.</div>
          )}
        </div>
      </div>
    </div>
  );
}
