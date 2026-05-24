import { useState, useEffect, useCallback, useRef } from 'react'

const countLines = (text) => text ? text.split('\n').filter(Boolean).length : 0

export default function OutputPanel({ output, elapsed, running, onClear }) {
  const [height, setHeight] = useState(180)
  const [activeTab, setActiveTab] = useState('all')
  const [copied, setCopied] = useState(false)
  const dragStartRef = useRef(null)

  useEffect(() => {
    if (output) setHeight(180)
  }, [output])

  const visible = running || output !== null
  const panelHeight = !visible ? 0 : (running && !output ? 48 : height)

  const stdoutLines = countLines(output?.stdout)
  const stderrLines = countLines(output?.stderr)

  const handleCopy = () => {
    let text = ''
    if (activeTab === 'all') {
      text = [output?.stderr, output?.stdout].filter(Boolean).join('\n')
    } else if (activeTab === 'stdout') {
      text = output?.stdout || ''
    } else {
      text = output?.stderr || ''
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1000)
    })
  }

  const startDrag = useCallback((startY) => {
    const startHeight = height

    const onMove = (e) => {
      const y = e.clientY ?? e.touches?.[0]?.clientY
      if (y == null) return
      const delta = startY - y
      setHeight(Math.max(80, Math.min(startHeight + delta, window.innerHeight * 0.5)))
    }

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
  }, [height])

  return (
    <div className="output-panel" style={{ height: panelHeight }}>
      <div
        className="output-panel-drag"
        onMouseDown={e => { e.preventDefault(); startDrag(e.clientY) }}
        onTouchStart={e => { e.preventDefault(); startDrag(e.touches[0].clientY) }}
      />

      <div className="output-panel-header">
        <div className="output-panel-tabs">
          <button
            className={`output-tab${activeTab === 'all' ? ' active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`output-tab${activeTab === 'stdout' ? ' active' : ''}`}
            onClick={() => setActiveTab('stdout')}
          >
            stdout
            {output && <span className="tab-badge">{stdoutLines}</span>}
          </button>
          <button
            className={`output-tab${activeTab === 'stderr' ? ' active' : ''}${stderrLines > 0 ? ' stderr-tab' : ''}`}
            onClick={() => setActiveTab('stderr')}
          >
            stderr
            {output && <span className="tab-badge">{stderrLines}</span>}
          </button>
        </div>
        <div className="output-panel-actions">
          {output && (
            <button className="output-action-btn" onClick={handleCopy}>
              {copied ? 'Copied!' : '⎘'}
            </button>
          )}
          <button className="output-action-btn" onClick={onClear}>×</button>
        </div>
      </div>

      <div className="output-panel-body">
        {running && !output && (
          <div className="output-panel-running">
            <span className="dancing-dots"><span /><span /><span /></span>
          </div>
        )}
        {output && (
          <>
            {(activeTab === 'all' || activeTab === 'stderr') && output.stderr && (
              <div className="output-section">
                {activeTab === 'all' && <div className="output-label output-label-stderr">stderr</div>}
                <pre className="output-pre output-pre-stderr">{output.stderr}</pre>
              </div>
            )}
            {(activeTab === 'all' || activeTab === 'stdout') && output.stdout && (
              <div className="output-section">
                {activeTab === 'all' && <div className="output-label output-label-stdout">stdout</div>}
                <pre className="output-pre output-pre-stdout">{output.stdout}</pre>
              </div>
            )}
            {!output.stderr && !output.stdout && output.exitCode === 0 && (
              <div className="output-no-output">(no output)</div>
            )}
          </>
        )}
      </div>

      {output && (
        <div className="output-panel-footer">
          exit {output.exitCode}{elapsed != null ? ` · ${elapsed}ms` : ''}
        </div>
      )}
    </div>
  )
}
