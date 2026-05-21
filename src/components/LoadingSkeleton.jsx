import { memo } from 'react'

function LoadingSkeleton({ variant = 'card' }) {
  if (variant === 'card') {
    return (
      <div className="skeleton-card">
        <div className="skeleton-shimmer"></div>
        <div className="skeleton-line title"></div>
        <div className="skeleton-meta">
          <div className="skeleton-line small"></div>
          <div className="skeleton-line tiny"></div>
        </div>
      </div>
    )
  }

  if (variant === 'detail') {
    return (
      <div className="skeleton-detail">
        <div className="skeleton-shimmer"></div>
        <div className="skeleton-line nav"></div>
        <div className="skeleton-line tags"></div>
        <div className="skeleton-line notes"></div>
        <div className="skeleton-block code"></div>
      </div>
    )
  }

  if (variant === 'editor') {
    return (
      <div className="skeleton-editor">
        <div className="skeleton-shimmer"></div>
        <div className="skeleton-line nav"></div>
        <div className="skeleton-block form"></div>
        <div className="skeleton-block code"></div>
      </div>
    )
  }

  return null
}

export default memo(LoadingSkeleton)
