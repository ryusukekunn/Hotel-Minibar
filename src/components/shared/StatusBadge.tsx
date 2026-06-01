import type { RoomStatus } from '../../types'

const statusConfig: Record<RoomStatus, { label: string; color: string; dot: string; bg: string }> = {
  free: {
    label: 'Slobodna',
    color: 'text-slate-400',
    dot: 'bg-slate-400',
    bg: 'bg-slate-400/10 border-slate-400/20',
  },
  occupied: {
    label: 'Zauzeta',
    color: 'text-blue-400',
    dot: 'bg-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/20',
  },
  checkout: {
    label: 'Odjava',
    color: 'text-orange-400',
    dot: 'bg-orange-400',
    bg: 'bg-orange-400/10 border-orange-400/20',
  },
  waiting_inspection: {
    label: 'Čeka pregled',
    color: 'text-amber-400',
    dot: 'bg-amber-400 animate-pulse',
    bg: 'bg-amber-400/10 border-amber-400/20',
  },
  inspected: {
    label: 'Pregledano',
    color: 'text-purple-400',
    dot: 'bg-purple-400',
    bg: 'bg-purple-400/10 border-purple-400/20',
  },
  ready_for_charge: {
    label: 'Spremo za naplatu',
    color: 'text-emerald-400',
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
  },
  completed: {
    label: 'Završeno',
    color: 'text-slate-500',
    dot: 'bg-slate-500',
    bg: 'bg-slate-500/10 border-slate-500/20',
  },
}

interface StatusBadgeProps {
  status: RoomStatus
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={`
        badge border
        ${config.bg} ${config.color}
        ${size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}
      `}
    >
      <span className={`status-dot ${config.dot}`} />
      {config.label}
    </span>
  )
}

export function getStatusConfig(status: RoomStatus) {
  return statusConfig[status]
}
