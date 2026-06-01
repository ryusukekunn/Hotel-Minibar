import Modal from './Modal'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  loading?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Potvrdi',
  cancelLabel = 'Otkaži',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const btnClass = {
    danger: 'btn-danger',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white font-medium px-4 py-3 rounded-xl transition-all touch-manipulation',
    default: 'btn-primary',
  }[variant]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <AlertTriangle size={28} className="text-red-400" />
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">{message}</p>
        <div className="flex gap-3 w-full mt-2">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`${btnClass} flex-1`}
            disabled={loading}
          >
            {loading ? 'Čekajte...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
