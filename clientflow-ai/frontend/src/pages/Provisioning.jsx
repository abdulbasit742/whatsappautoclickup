import { useEffect, useState } from 'react';
import { Upload, UserPlus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const STATUS_COLORS = {
  true:  'bg-emerald-500/20 text-emerald-400',
  false: 'bg-yellow-500/20 text-yellow-400',
};

export default function Provisioning() {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [form, setForm]           = useState({ name: '', email: '', phone: '', role: 'agent', department: '', title: '' });
  const [dragOver, setDragOver]   = useState(false);
  const [csvFile, setCsvFile]     = useState(null);
  const [bulkResult, setBulkResult] = useState(null);

  const loadUsers = () => api.get('/provisioning/users').then(r => setUsers(r.data)).finally(() => setLoading(false));

  useEffect(() => { loadUsers(); }, []);

  const createUser = async () => {
    if (!form.name || !form.email) return alert('Name and email required');
    try {
      await api.post('/provisioning/users', form);
      setForm({ name: '', email: '', phone: '', role: 'agent', department: '', title: '' });
      loadUsers();
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const handleCSVUpload = async () => {
    if (!csvFile) return alert('Select a CSV file first');
    const fd = new FormData();
    fd.append('file', csvFile);
    try {
      const r = await api.post('/provisioning/bulk', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBulkResult(r.data);
      loadUsers();
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  if (loading) return <div className="text-emerald-400 animate-pulse">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><UserPlus size={20} className="text-emerald-400" /> User Provisioning</h2>
        <div className="flex gap-2">
          {['users', 'create', 'bulk'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${activeTab === tab ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
              {tab === 'bulk' ? 'Bulk Import' : tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#2a2a2a]">
              <th className="text-left px-4 py-3 text-gray-400">Name</th>
              <th className="text-left px-4 py-3 text-gray-400">Email</th>
              <th className="text-left px-4 py-3 text-gray-400">Role</th>
              <th className="text-left px-4 py-3 text-gray-400">Verified</th>
              <th className="text-left px-4 py-3 text-gray-400">Created</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-[#1f1f1f] hover:bg-white/5">
                  <td className="px-4 py-3 text-white">{u.name}</td>
                  <td className="px-4 py-3 text-gray-400">{u.email}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">{u.role || 'unassigned'}</span></td>
                  <td className="px-4 py-3">
                    {u.is_verified
                      ? <CheckCircle size={14} className="text-emerald-400" />
                      : <Clock       size={14} className="text-yellow-400" />}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No users provisioned yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 max-w-lg">
          <h3 className="font-semibold text-white mb-4">Create User</h3>
          <div className="grid grid-cols-2 gap-4">
            {[['name','Name'],['email','Email'],['phone','Phone'],['department','Department'],['title','Job Title']].map(([key, label]) => (
              <div key={key} className={key === 'email' || key === 'name' ? 'col-span-2' : ''}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                {['super_admin','admin','manager','agent','viewer'].map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
              </select>
            </div>
          </div>
          <button onClick={createUser} className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
            Create User
          </button>
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setCsvFile(f); }}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${dragOver ? 'border-emerald-500 bg-emerald-500/5' : 'border-[#2a2a2a]'}`}
          >
            <Upload size={32} className="text-gray-500 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Drag &amp; drop CSV file here, or</p>
            <label className="mt-2 inline-block cursor-pointer text-emerald-400 text-sm hover:text-emerald-300">
              Browse file
              <input type="file" accept=".csv" className="hidden" onChange={e => setCsvFile(e.target.files[0])} />
            </label>
            {csvFile && <p className="mt-2 text-xs text-emerald-400">Selected: {csvFile.name}</p>}
          </div>
          <p className="text-xs text-gray-500">CSV columns: name, email, phone, role, department, title</p>
          <button onClick={handleCSVUpload} disabled={!csvFile} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm transition-colors">
            Import Users
          </button>
          {bulkResult && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex gap-6">
                <div className="text-center"><div className="text-2xl font-bold text-emerald-400">{bulkResult.success?.length || 0}</div><div className="text-xs text-gray-500">Imported</div></div>
                <div className="text-center"><div className="text-2xl font-bold text-red-400">{bulkResult.errors?.length || 0}</div><div className="text-xs text-gray-500">Errors</div></div>
              </div>
              {bulkResult.errors?.length > 0 && (
                <div className="mt-4 space-y-1">
                  {bulkResult.errors.map((e, i) => (
                    <div key={i} className="text-xs text-red-400 flex gap-2"><AlertCircle size={12} />{e.email}: {e.error}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
