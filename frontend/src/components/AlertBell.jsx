import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function AlertBell() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    api.get('/alerts/count').then(r => setCount(r.data.count));
  }, []);
  return (
    <div className="relative">
      <Bell size={20} className="text-gray-400" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </div>
  );
}
