import { memo } from 'react'

function EmptyState({ icon, title, subtitle, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-subtitle">{subtitle}</p>
      {actionLabel && onAction && (
        <button className="empty-state-action action-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default memo(EmptyState)
