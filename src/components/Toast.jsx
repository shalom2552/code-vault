import { memo } from 'react'

function Toast({ message, type = 'info' }) {
  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">{message}</div>
    </div>
  )
}

export default memo(Toast)
