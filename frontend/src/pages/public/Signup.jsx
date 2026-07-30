import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { authService } from '../../services/auth.service.js'
import { useAuthStore } from '../../stores/authStore.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'

export default function Signup() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [form, setForm] = useState({ orgName: '', name: '', email: '', password: '', confirmPassword: '', terms: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!form.terms) {
      setError('Please accept the terms of service.')
      return
    }
    setLoading(true)
    try {
      const data = await authService.register(form)
      login(data)
      navigate('/app/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-2xl font-black text-gray-900">ClientFlow AI</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 mb-6">Start free — no credit card required</p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Organization name" value={form.orgName} onChange={set('orgName')} placeholder="Acme Corp" required />
            <Input label="Your name" value={form.name} onChange={set('name')} placeholder="John Smith" required />
            <Input label="Email address" type="email" value={form.email} onChange={set('email')} placeholder="john@acmecorp.com" required />
            <Input label="Password" type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 characters" required />
            <Input label="Confirm password" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat password" required />

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.terms}
                onChange={set('terms')}
                className="mt-0.5 rounded border-gray-300 text-brand-600"
              />
              <span className="text-sm text-gray-600">
                I agree to the{' '}
                <a href="#" className="text-brand-600 hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-brand-600 hover:underline">Privacy Policy</a>
              </span>
            </label>

            <Button type="submit" variant="primary" className="w-full" size="lg" loading={loading}>
              Create Account
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
