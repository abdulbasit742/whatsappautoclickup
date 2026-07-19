import { useEffect, useState } from 'react';
import { Shield, Check, X, Plus, Trash2 } from 'lucide-react';
import api from '../utils/api';

const MODULES = ['dashboard','inbox','crm','campaigns','ai_center','billing','integrations','settings','analytics','audit_logs'];
const ACTIONS = ['view','create','edit','delete','export','manage'];
const ROLES   = ['org_admin','manager','agent','support','viewer'];
const ROLE_COLORS = {
  org_admin: 'text-blue-400', manager: 'text-emerald-400',
  agent: 'text-yellow-400', support: 'text-orange-400', viewer: 'text-gray-400',
};

const DEFAULT_MATRIX = {
  org_admin:  { dashboard: ['view','manage'], inbox: ['view','create','edit','delete'], crm: ['view','create','edit','delete','export'], campaigns: ['view','create','edit','delete','export'], ai_center: ['view','create','edit'], billing: ['view','manage'], integrations: ['view','manage'], settings: ['view','manage'], analytics: ['view','export'], audit_logs: ['view'] },
  manager:    { dashboard: ['view'], inbox: ['view','create','edit'], crm: ['view','create','edit','export'], campaigns: ['view','create','edit'], ai_center: ['view'], analytics: ['view','export'], audit_logs: ['view'], settings: ['view'] },
  agent:      { dashboard: ['view'], inbox: ['view','create','edit'], crm: ['view','create','edit'], campaigns: ['view'], ai_center: ['view'] },
  support:    { dashboard: ['view'], inbox: ['view','create'], crm: ['view'] },
  viewer:     { dashboard: ['view'], inbox: ['view'], crm: ['view'], analytics: ['view'], campaigns: ['view'] },
};

export default function Permissions() {
  const [custom, setCustom]   = useState([]);
  const [selectedRole, setSelectedRole] = useState('agent');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/rbac').then(r => setCustom(r.data.custom || [])).finally(() => setLoading(false));
  }, []);

  const hasPermission = (role, mod, action) => {
    if (custom.find(c => c.role === role && c.module === mod && c.action === action)) return true;
    return DEFAULT_MATRIX[role]?.[mod]?.includes(action) || false;
  };

  const togglePermission = async (role, mod, action) => {
    const has = hasPermission(role, mod, action);
    if (has) {
      await api.delete('/rbac', { data: { role, module: mod, action } });
      // Add an explicit deny by removing from defaults... simplified: just track custom
    } else {
      await api.post('/rbac', { role, module: mod, action });
      setCustom(c => [...c, { role, module: mod, action }]);
    }
  };

  if (loading) return <div className="text-gray-400">Loading permissions...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Shield size={22} className="text-emerald-400" />
        <h2 className="text-xl font-bold text-white">Role & Permission Matrix</h2>
      </div>

      {/* Role selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {ROLES.map(r => (
          <button key={r} onClick={() => setSelectedRole(r)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize ${selectedRole === r ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
            {r.replace('_',' ')}
          </button>
        ))}
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              <th className="text-left px-4 py-3 text-gray-400 font-medium w-40">Module</th>
              {ACTIONS.map(a => (
                <th key={a} className="px-3 py-3 text-gray-400 font-medium text-center capitalize">{a}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(mod => (
              <tr key={mod} className="border-b border-[#2a2a2a] hover:bg-[#222]">
                <td className="px-4 py-3 text-white capitalize font-medium">{mod.replace('_',' ')}</td>
                {ACTIONS.map(action => {
                  const allowed = hasPermission(selectedRole, mod, action);
                  return (
                    <td key={action} className="px-3 py-3 text-center">
                      <button
                        onClick={() => togglePermission(selectedRole, mod, action)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-colors ${allowed ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40' : 'bg-[#2a2a2a] text-gray-600 hover:bg-[#333]'}`}
                      >
                        {allowed ? <Check size={12} /> : <X size={12} />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1 mr-4"><span className="w-3 h-3 bg-emerald-500/20 rounded inline-block" /> Allowed</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-[#2a2a2a] rounded inline-block" /> Denied</span>
        <span className="ml-4 text-gray-600">Super Admin has full access to all modules.</span>
      </div>
    </div>
  );
}
