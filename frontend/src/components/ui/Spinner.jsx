import { Loader2 } from 'lucide-react'

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
}

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <Loader2
      className={`animate-spin text-brand-500 ${sizes[size]} ${className}`}
    />
  )
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  )
}
