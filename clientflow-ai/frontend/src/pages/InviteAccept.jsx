import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '../utils/api';

export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.post(`/orgs/invites/accept/${token}`)
      .then(r => setInvite(r.data))
      .catch(err => setError(err.response?.data?.error || 'Invalid invite'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f0f] gap-4">
      <Loader2 size={32} className="text-emerald-400 animate-spin" />
      <p className="text-gray-400 text-sm">Verifying invite...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f0f] gap-4 text-center px-4">
      <AlertCircle size={48} className="text-red-400" />
      <h1 className="text-xl font-bold text-white">Invite Error</h1>
      <p className="text-gray-400 text-sm max-w-sm">{error}</p>
      <button onClick={() => navigate('/login')} className="mt-4 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">
        Back to Login
      </button>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f0f] gap-4 text-center px-4">
      <CheckCircle2 size={48} className="text-emerald-400" />
      <h1 className="text-xl font-bold text-white">You've been invited!</h1>
      <p className="text-gray-400 text-sm max-w-sm">
        You've been invited to join as <span className="text-white font-semibold capitalize">{invite?.role}</span>.
        Create your account to accept.
      </p>
      <div className="flex gap-3 mt-2">
        <button onClick={() => navigate(`/login?invite=${token}&email=${invite?.email}`)}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">
          Accept & Create Account
        </button>
        <button onClick={() => navigate('/login')} className="px-5 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white text-sm rounded-lg transition-colors">
          Log In Instead
        </button>
      </div>
    </div>
  );
}
