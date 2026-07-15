import { useState, useEffect } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';
import api from '../utils/api';

const USER_ID = 'demo-user'; // In production, from auth context

export default function OrgSwitcher() {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get(`/orgs/user/${USER_ID}`)
      .then(r => {
        setOrgs(r.data);
        const stored = localStorage.getItem('active_org_id');
        if (stored) setActiveOrgId(stored);
        else if (r.data[0]) setActiveOrgId(r.data[0].id);
      })
      .catch(() => {});
  }, []);

  async function switchOrg(orgId) {
    try {
      await api.post(`/orgs/user/${USER_ID}/switch`, { org_id: orgId });
      localStorage.setItem('active_org_id', orgId);
      setActiveOrgId(orgId);
      setOpen(false);
      window.location.reload(); // Re-fetch all org-scoped data
    } catch {}
  }

  const active = orgs.find(o => o.id === activeOrgId);

  if (orgs.length <= 1) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] rounded-lg text-sm text-white transition-colors"
      >
        <Building2 size={14} className="text-emerald-400" />
        <span className="max-w-[120px] truncate">{active?.name || 'Select Org'}</span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 text-xs text-gray-500 uppercase tracking-wide px-3 pt-3">Switch Organization</div>
          {orgs.map(org => (
            <button
              key={org.id}
              onClick={() => switchOrg(org.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 text-left transition-colors"
            >
              <div>
                <div className="text-sm text-white">{org.name}</div>
                <div className="text-xs text-gray-500 capitalize">{org.role}</div>
              </div>
              {org.id === activeOrgId && <Check size={14} className="text-emerald-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
