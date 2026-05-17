export default function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Delete', dangerous = true }) {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          <button className="dialog-btn dialog-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className={`dialog-btn${dangerous ? ' dialog-btn-danger' : ''}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
