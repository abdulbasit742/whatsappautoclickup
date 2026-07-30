import Badge from './Badge.jsx'

const statusMap = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'neutral' },
  pending: { label: 'Pending', variant: 'warning' },
  suspended: { label: 'Suspended', variant: 'error' },
  open: { label: 'Open', variant: 'info' },
  closed: { label: 'Closed', variant: 'neutral' },
  resolved: { label: 'Resolved', variant: 'success' },
  draft: { label: 'Draft', variant: 'neutral' },
  running: { label: 'Running', variant: 'success' },
  paused: { label: 'Paused', variant: 'warning' },
  completed: { label: 'Completed', variant: 'brand' },
  failed: { label: 'Failed', variant: 'error' },
  scheduled: { label: 'Scheduled', variant: 'purple' },
  new: { label: 'New', variant: 'info' },
  hot: { label: 'Hot', variant: 'error' },
  warm: { label: 'Warm', variant: 'warning' },
  cold: { label: 'Cold', variant: 'neutral' },
  customer: { label: 'Customer', variant: 'success' },
  lost: { label: 'Lost', variant: 'error' },
  critical: { label: 'Critical', variant: 'error' },
  high: { label: 'High', variant: 'warning' },
  medium: { label: 'Medium', variant: 'info' },
  low: { label: 'Low', variant: 'neutral' },
  connected: { label: 'Connected', variant: 'success' },
  disconnected: { label: 'Disconnected', variant: 'neutral' },
  error_status: { label: 'Error', variant: 'error' },
}

export default function StatusChip({ status, size = 'md', className = '' }) {
  const config = statusMap[status?.toLowerCase()] || { label: status, variant: 'neutral' }
  return <Badge variant={config.variant} size={size} dot className={className}>{config.label}</Badge>
}
