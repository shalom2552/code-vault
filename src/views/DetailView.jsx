import { useState, useEffect } from 'react'
import CodeBlock from '../components/CodeBlock.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import LoadingSkeleton from '../components/LoadingSkeleton.jsx'
import { useToast } from '../components/ToastContext.jsx'
import { api } from '../api.js'

export default function DetailView({ id, onBack, onEdit, onDeleted }) {
  const [snippet, setSnippet] = useState(null)
  const [activeFile, setActiveFile] = useState(0)
  const [stdin, setStdin] = useState('')
  const [running, setRunning] = useState(false)
  const [runOutput, setRunOutput] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setSnippet(null)
    setError(null)
    setActiveFile(0)
    setRunOutput(null)
    api.getSnippet(id)
      .then(setSnippet)
      .catch(e => setError(e.message))
  }, [id])

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
      setSnippet(s => s ? { ...s, runs: out.runs ?? s.runs } : s)
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

  const handleCopyCode = () => {
    const file = snippet.files[activeFile]
    if (file && file.content) {
      navigator.clipboard.writeText(file.content)
      toast('Code copied to clipboard', 'success')
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
      <div className="nav-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, margin: '0 1rem' }}>
          <span className="nav-title">{snippet.title}</span>
          <span className="nav-timestamps" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Created: {new Date(snippet.createdAt).toLocaleString()} | Updated: {new Date(snippet.updatedAt).toLocaleString()}
          </span>
        </div>
        <div className="nav-actions">
          <button className="action-btn" onClick={handleCopyCode}>Copy</button>
          <button className="action-btn" onClick={handleDuplicate}>Duplicate</button>
          <button className="action-btn" onClick={handlePin} title={snippet.pinned ? 'Unpin' : 'Pin'}>
            {snippet.pinned ? '★' : '☆'}
          </button>
          <button className="action-btn" onClick={onEdit}>Edit</button>
          <button className="action-btn danger" onClick={() => setConfirming(true)}>Del</button>
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

        <CodeBlock code={file?.content || ''} filename={snippet.files.length === 1 ? file?.name : null} language={snippet.language ?? 'cpp'} />

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
          {running ? '…' : '▶ Run'}
        </button>
      </div>
      {confirming && (
        <ConfirmDialog
          message={`Delete "${snippet.title}"?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
