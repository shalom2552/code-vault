import { useState, useEffect } from 'react'
import CodeBlock from '../components/CodeBlock.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { api } from '../api.js'

export default function DetailView({ id, onBack, onEdit, onDeleted }) {
  const [snippet, setSnippet] = useState(null)
  const [activeFile, setActiveFile] = useState(0)
  const [stdin, setStdin] = useState('')
  const [running, setRunning] = useState(false)
  const [runOutput, setRunOutput] = useState(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    setSnippet(null)
    setActiveFile(0)
    setRunOutput(null)
    api.getSnippet(id).then(setSnippet)
  }, [id])

  const handleDelete = async () => {
    await api.deleteSnippet(id)
    onDeleted()
  }

  const handleRun = async () => {
    setRunning(true)
    setRunOutput(null)
    const out = await api.runSnippet(id, stdin)
    setRunOutput(out)
    setRunning(false)
  }

  if (!snippet) return <div className="loading">Loading...</div>

  const file = snippet.files[activeFile]

  return (
    <div className="detail-view">
      <div className="nav-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <span className="nav-title">{snippet.title}</span>
        <div className="nav-actions">
          <button className="action-btn" onClick={onEdit}>Edit</button>
          <button className="action-btn danger" onClick={() => setConfirming(true)}>Del</button>
        </div>
      </div>

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
                key={f.name}
                className={`file-tab${activeFile === i ? ' active' : ''}`}
                onClick={() => setActiveFile(i)}
              >{f.name}</button>
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
