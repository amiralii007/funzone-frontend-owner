import React from 'react'

interface EventConflictDialogProps {
  isOpen: boolean
  onClose: () => void
  onProceed: () => void
  onEdit: () => void
  conflictingEvents: any[]
}

export default function EventConflictDialog({
  isOpen,
  onClose,
  onProceed,
  onEdit,
  conflictingEvents
}: EventConflictDialogProps) {
  console.log('=== EventConflictDialog Render ===')
  console.log('isOpen:', isOpen)
  console.log('conflictingEvents:', conflictingEvents)
  console.log('conflictingEvents length:', conflictingEvents.length)
  
  if (!isOpen) {
    console.log('Dialog not open, returning null')
    return null
  }
  
  console.log('Dialog is open, rendering...')

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="glass-card p-6 max-w-md w-full space-y-4 animate-scale-in">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">
            رویداد شما با رویداد دیگری تداخل دارد
          </h2>
          <p className="text-slate-400 text-sm">
            آیا مشکلی ندارید؟
          </p>
        </div>

        {/* Conflicting Events List */}
        {conflictingEvents.length > 0 && (
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <h3 className="text-sm font-medium text-slate-300 mb-2">
              رویدادهای تداخل‌دار:
            </h3>
            <div className="space-y-2">
              {conflictingEvents.map((event, index) => (
                <div key={index} className="text-xs text-slate-400 bg-slate-700/30 p-2 rounded">
                  <div className="font-medium text-slate-300">{event.name}</div>
                  <div className="text-slate-500">
                    {event.date} - {event.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onProceed}
            className="btn-primary w-full"
          >
            خیر مشکلی نیست
          </button>
          <button
            onClick={onEdit}
            className="btn-ghost w-full"
          >
            بزار درستش کنم
          </button>
          <button
            onClick={onClose}
            className="btn-ghost w-full text-slate-400 hover:text-slate-200"
          >
            لغو
          </button>
        </div>
      </div>
    </div>
  )
}
