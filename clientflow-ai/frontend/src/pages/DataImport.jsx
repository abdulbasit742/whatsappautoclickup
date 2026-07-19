import { useEffect, useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import api from '../utils/api';

const STEPS = ['Upload', 'Map Columns', 'Preview', 'Import'];

export default function DataImport() {
  const [step, setStep]           = useState(0);
  const [jobs, setJobs]           = useState([]);
  const [currentJob, setCurrentJob] = useState(null);
  const [headers, setHeaders]     = useState([]);
  const [preview, setPreview]     = useState([]);
  const [mapping, setMapping]     = useState({});
  const [result, setResult]       = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);

  const TARGET_FIELDS = ['whatsapp_number', 'name', 'email', 'status', 'notes'];

  const loadJobs = async () => {
    const r = await api.get('/import');
    setJobs(r.data);
  };

  useEffect(() => { loadJobs(); }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post('/import/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCurrentJob(r.data.job);
      setHeaders(r.data.headers);
      setPreview(r.data.preview);
      // Auto-map headers with matching names
      const autoMap = {};
      r.data.headers.forEach(h => {
        if (TARGET_FIELDS.includes(h.toLowerCase())) autoMap[h.toLowerCase()] = h;
      });
      setMapping(autoMap);
      setStep(1);
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally { setUploading(false); }
  };

  const runImport = async () => {
    if (!currentJob) return;
    setImporting(true);
    try {
      const r = await api.post(`/import/${currentJob.id}/map`, { column_map: mapping });
      setResult(r.data);
      setStep(3);
      loadJobs();
    } catch (err) {
      alert('Import failed: ' + (err.response?.data?.error || err.message));
    } finally { setImporting(false); }
  };

  const reset = () => {
    setStep(0); setCurrentJob(null); setHeaders([]); setPreview([]); setMapping({}); setResult(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Data Import</h2>
        {step > 0 && (
          <button onClick={reset} className="text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg text-sm">
            Start Over
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${i === step ? 'bg-emerald-500/20 text-emerald-400' : i < step ? 'text-emerald-400' : 'text-gray-600'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-emerald-500/30' : 'bg-[#2a2a2a]'}`}>
                {i < step ? '✓' : i + 1}
              </span>
              {s}
            </div>
            {i < STEPS.length - 1 && <ArrowRight size={14} className="text-gray-600" />}
          </div>
        ))}
      </div>

      {/* Step 0: Upload */}
      {step === 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <Upload size={28} className="text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Upload CSV File</h3>
          <p className="text-gray-500 text-sm mb-6">Import clients from a CSV file. Supported columns: phone, name, email, status, notes.</p>
          <label className={`inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg cursor-pointer text-sm font-medium ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Upload size={16} />
            {uploading ? 'Uploading...' : 'Choose CSV File'}
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} disabled={uploading} />
          </label>
        </div>
      )}

      {/* Step 1: Map columns */}
      {step === 1 && (
        <div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-4">
            <h3 className="text-sm font-semibold text-white mb-4">Map CSV Columns to Fields</h3>
            <div className="space-y-3">
              {TARGET_FIELDS.map(field => (
                <div key={field} className="flex items-center gap-4">
                  <span className="text-sm text-gray-300 w-40 shrink-0">{field}</span>
                  <ArrowRight size={14} className="text-gray-600 shrink-0" />
                  <select
                    value={mapping[field] || ''}
                    onChange={e => setMapping(m => ({ ...m, [field]: e.target.value || undefined }))}
                    className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">— skip —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => setStep(2)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium">
            Preview Data →
          </button>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && (
        <div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-[#2a2a2a]">
              <h3 className="text-sm font-semibold text-white">Data Preview (first 5 rows)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    {headers.map(h => <th key={h} className="text-left text-gray-500 px-4 py-2 font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b border-[#2a2a2a] hover:bg-white/5">
                      {headers.map(h => <td key={h} className="px-4 py-2 text-gray-300">{row[h] || '—'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="bg-[#2a2a2a] text-gray-300 px-4 py-2 rounded-lg text-sm">← Back</button>
            <button onClick={runImport} disabled={importing} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {importing ? 'Importing...' : 'Import Now'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 3 && result && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center">
          <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Import Complete!</h3>
          <div className="flex justify-center gap-6 my-4">
            <div className="text-center"><div className="text-2xl font-bold text-emerald-400">{result.imported}</div><div className="text-xs text-gray-500">Imported</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-yellow-400">{result.skipped}</div><div className="text-xs text-gray-500">Skipped</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-red-400">{result.errors?.length || 0}</div><div className="text-xs text-gray-500">Errors</div></div>
          </div>
          {result.errors?.length > 0 && (
            <div className="mt-3 text-xs text-red-400 text-left max-h-32 overflow-y-auto bg-red-500/5 rounded-lg p-3">
              {result.errors.map((e, i) => <div key={i}>Row {e.row}: {e.error}</div>)}
            </div>
          )}
          <button onClick={reset} className="mt-5 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium">
            Import Another File
          </button>
        </div>
      )}

      {/* Past jobs */}
      {jobs.length > 0 && step === 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Recent Imports</h3>
            <button onClick={loadJobs}><RefreshCw size={14} className="text-gray-500" /></button>
          </div>
          <div className="space-y-2">
            {jobs.map(j => (
              <div key={j.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-gray-500" />
                  <div>
                    <p className="text-sm text-white">{j.filename}</p>
                    <p className="text-xs text-gray-500">{new Date(j.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{j.imported}/{j.total_rows} rows</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${j.status === 'done' ? 'bg-emerald-500/20 text-emerald-400' : j.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{j.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
