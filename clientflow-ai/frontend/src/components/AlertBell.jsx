import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';

export default function AlertBell() {
  const [count, setCount] = useState(0);

  const refresh = () => api.get('/alerts/count').then(r => setCount(r.data.count)).catch(() => {});

  useEffect(() => {
    refresh();
    const socket = io('', { path: '/socket.io' });
    socket.on('new_alert', () => refresh());
    return () => socket.disconnect();
  }, []);

  return (
    <div className="relative cursor-pointer" title={`${count} unresolved alert${count !== 1 ? 's' : ''}`}>
      <Bell size={18} className={count > 0 ? 'text-red-400' : 'text-gray-400'} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </div>
  );
}
