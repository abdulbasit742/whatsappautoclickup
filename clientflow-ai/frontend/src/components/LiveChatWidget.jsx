import { useState, useEffect } from 'react';
import { MessageSquare, Flag } from 'lucide-react';
import api from '../utils/api';

export default function LiveChatWidget() {
  const [config, setConfig] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get('/livechat/live-chat').then(r => setConfig(r.data)).catch(() => {});
  }, []);

  if (!config) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-50"
        title="Live Chat"
      >
        <MessageSquare size={22} />
      </button>

      {/* Widget panel */}
      {open && (
        <div className="fixed bottom-24 right-6 w-80 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="bg-emerald-600 p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <MessageSquare size={16} className="text-white" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Live Support</div>
              <div className="text-emerald-200 text-xs">We'll be right with you</div>
            </div>
          </div>
          <div className="p-5 text-center space-y-4">
            {config.enabled ? (
              <p className="text-gray-300 text-sm">Live chat is loading...</p>
            ) : (
              <>
                <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto">
                  <Flag size={20} className="text-yellow-400" />
                </div>
                <p className="text-white font-medium text-sm">Live Chat Coming Soon</p>
                <p className="text-gray-400 text-xs">{config.placeholder_message}</p>
                <a
                  href="/support"
                  className="block w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                  onClick={() => setOpen(false)}
                >
                  Open Support Form
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
