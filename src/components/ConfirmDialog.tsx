interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onCancel}
    >
      <div
        className="animate-pop w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-semibold text-slate-800">{title}</h2>
        <p className="mb-6 text-sm text-slate-600">{message}</p>
        <div className="flex justify-center gap-3">
          <button type="button" onClick={onCancel} className="text-sm text-slate-500">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              danger ? 'bg-red-600' : 'bg-emerald-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
