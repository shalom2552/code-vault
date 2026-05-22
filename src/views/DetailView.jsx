import { useState, useEffect, useRef } from 'react'
import CodeBlock from '../components/CodeBlock.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import LoadingSkeleton from '../components/LoadingSkeleton.jsx'
import { useToast } from '../components/ToastContext.jsx'
import { api } from '../api.js'

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.round(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  const mo = Math.round(d / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.round(mo / 12)}y ago`
}

function TimestampRow({ snippet }) {
  const created = new Date(snippet.createdAt)
  const updated = new Date(snippet.updatedAt)
  const sameTime = Math.abs(created - updated) < 1000
  if (sameTime) {
    return <span title={created.toLocaleString()}>Created {relativeTime(snippet.createdAt)}</span>
  }
  return (
    <>
      <span title={created.toLocaleString()}>Created {relativeTime(snippet.createdAt)}</span>
      {' · '}
      <span title={updated.toLocaleString()}>Updated {relativeTime(snippet.updatedAt)}</span>
    </>
  )
}

export default function DetailView({ id, onBack, onEdit, onDeleted, fontSize = 14, cycleFont }) {
  const [snippet, setSnippet] = useState(null)
  const [activeFile, setActiveFile] = useState(0)
  const [stdin, setStdin] = useState('')
  const [running, setRunning] = useState(false)
  const [runOutput, setRunOutput] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [overflowPos, setOverflowPos] = useState({ x: 0, y: 0 })
  const overflowBtnRef = useRef(null)
  const { toast } = useToast()

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSnippet(null)
    setError(null)
    setActiveFile(0)
    setRunOutput(null)
    /* eslint-enable react-hooks/set-state-in-effect */
    api.getSnippet(id)
      .then(setSnippet)
      .catch(e => setError(e.message))
  }, [id])

  const openOverflow = () => {
    if (overflowBtnRef.current) {
      const rect = overflowBtnRef.current.getBoundingClientRect()
      const menuW = 180
      setOverflowPos({
        x: Math.max(8, Math.min(rect.right - menuW, window.innerWidth - menuW - 8)),
        y: Math.min(rect.bottom + 4, window.innerHeight - 170),
      })
    }
    setOverflowOpen(true)
  }

  const handleDelete = async () => {
    try {
      setError(null)
      await api.deleteSnippet(id)
      toast('Snippet deleted', 'success')
      onDeleted()
    } catch (e) {
      const msg = `Delete failed: ${e.message}`
      setError(msg)
      toast(msg, 'error')
    }
  }

  const handleRun = async () => {
    setRunning(true)
    setError(null)
    setRunOutput(null)
    try {
      const out = await api.runSnippet(id, stdin)
      setRunOutput(out)
      const newRun = { stdout: out.stdout, stderr: out.stderr, exitCode: out.exitCode, timestamp: new Date().toISOString() }
      setSnippet(s => s ? { ...s, runs: [newRun, ...(s.runs ?? [])].slice(0, 5) } : s)
    } catch (e) {
      setError(`Run failed: ${e.message}`)
    } finally {
      setRunning(false)
    }
  }

  const handlePin = async () => {
    try {
      const { pinned } = await api.pinSnippet(id)
      setSnippet(s => s ? { ...s, pinned } : s)
      toast(pinned ? 'Snippet pinned' : 'Snippet unpinned', 'success')
    } catch (e) {
      const msg = `Pin failed: ${e.message}`
      setError(msg)
      toast(msg, 'error')
    }
  }

  const handleDuplicate = async () => {
    try {
      const body = {
        title: `${snippet.title} (copy)`,
        tags: snippet.tags,
        notes: snippet.notes,
        language: snippet.language,
        files: snippet.files.map(f => ({ name: f.name, content: f.content })),
        compilerFlags: snippet.compilerFlags || []
      }
      await api.createSnippet(body)
      toast('Snippet duplicated successfully', 'success')
    } catch (e) {
      toast(`Duplicate failed: ${e.message}`, 'error')
    }
  }

  if (error && !snippet) return (
    <div className="detail-view">
      <div className="nav-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <span className="nav-title">Error</span>
      </div>
      <div className="error-banner">{error}</div>
    </div>
  )

  if (!snippet) return (
    <div className="detail-view">
      <LoadingSkeleton variant="detail" />
    </div>
  )

  const file = snippet.files[activeFile]
  const runs = snippet.runs ?? []

  return (
    <div className="detail-view">
      <div className="nav-header detail-nav">
        <div className="detail-header-top">
          <button className="back-btn" onClick={onBack}>←</button>
          <span className="nav-title">
            {snippet.pinned && <span className="pin-indicator" title="Pinned">📌</span>}
            {snippet.title}
          </span>
          <div className="nav-actions">
            <button className="action-btn" onClick={onEdit}>Edit</button>
            <button
              ref={overflowBtnRef}
              className="overflow-btn"
              onClick={openOverflow}
              aria-label="More actions"
            >⋮</button>
          </div>
        </div>
        <div className="detail-timestamps">
          <TimestampRow snippet={snippet} />
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="detail-scroll">
        {snippet.tags.length > 0 && (
          <div className="detail-tags">
            {snippet.tags.map(t => <span key={t} className="tag-chip">{t}</span>)}
          </div>
        )}

        {snippet.notes && <p className="detail-notes">{snippet.notes}</p>}

        {snippet.files.length > 1 && (
          <div className="file-tabs">
            {snippet.files.map((f, i) => (
              <button
                key={f.name || i}
                className={`file-tab${activeFile === i ? ' active' : ''}${!f.content && f.name ? ' missing' : ''}`}
                onClick={() => setActiveFile(i)}
              >
                {f.name || '(untitled)'}
                {!f.content && f.name && <span className="missing-indicator" title="File content missing">!</span>}
              </button>
            ))}
          </div>
        )}

        <CodeBlock
          code={file?.content || ''}
          filename={snippet.files.length === 1 ? file?.name : null}
          language={snippet.language ?? 'cpp'}
          fontSize={fontSize}
          onCycleFont={cycleFont}
        />

        {runOutput && (
          <div className="run-output">
            {runOutput.stderr && <pre className="run-stderr">{runOutput.stderr}</pre>}
            {runOutput.stdout && <pre className="run-stdout">{runOutput.stdout}</pre>}
            <div className="exit-code">exit {runOutput.exitCode}</div>
          </div>
        )}

        {runs.length > 0 && (
          <div className="run-history">
            <button className="run-history-toggle" onClick={() => setHistoryOpen(o => !o)}>
              {historyOpen ? '▾' : '▸'} Run history ({runs.length})
            </button>
            {historyOpen && (
              <div className="run-history-list">
                {[...runs].slice(-5).reverse().map((r, i) => (
                  <div key={i} className="run-history-entry">
                    <div className="run-history-meta">
                      <span className="run-history-time">{new Date(r.timestamp).toLocaleString()}</span>
                      <span className="run-history-exit">exit {r.exitCode}</span>
                    </div>
                    {r.stderr && <pre className="run-stderr run-history-output">{r.stderr}</pre>}
                    {r.stdout && <pre className="run-stdout run-history-output">{r.stdout}</pre>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="run-footer">
        <textarea
          className="stdin-input playground-stdin"
          placeholder="stdin (optional)"
          value={stdin}
          onChange={e => setStdin(e.target.value)}
          rows={1}
        />
        <button className="playground-run-btn" onClick={handleRun} disabled={running}>
          {running ? <><span className="spinner" /> Running…</> : '▶ Run'}
        </button>
      </div>

      {confirming && (
        <ConfirmDialog
          message={`Delete "${snippet.title}"?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
        />
      )}

      {overflowOpen && (
        <div className="ctx-overlay" onClick={() => setOverflowOpen(false)}>
          <div className="ctx-menu" style={{ left: overflowPos.x, top: overflowPos.y }} onClick={e => e.stopPropagation()}>
            <button className="ctx-item" onClick={() => { handleDuplicate(); setOverflowOpen(false) }}>Duplicate</button>
            <button className="ctx-item" onClick={() => { handlePin(); setOverflowOpen(false) }}>
              {snippet.pinned ? 'Unpin' : '📌 Pin'}
            </button>
            <button className="ctx-item ctx-item-danger" onClick={() => { setConfirming(true); setOverflowOpen(false) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
