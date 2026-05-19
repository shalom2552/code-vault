import { useEffect, useRef } from 'react'

export default function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Delete', dangerous = true }) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement
    const focusableElements = dialogRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel()
      }
      if (e.key === 'Tab') {
        const focusable = Array.from(dialogRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (previousFocusRef.current) {
        previousFocusRef.current.focus()
      }
    }
  }, [onCancel])

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={e => e.stopPropagation()} ref={dialogRef} role="dialog" aria-modal="true" aria-description={message}>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          <button className="dialog-btn dialog-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className={`dialog-btn${dangerous ? ' dialog-btn-danger' : ''}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
