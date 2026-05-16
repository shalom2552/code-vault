import { useState } from 'react'
import CodeEditor from '../components/CodeEditor.jsx'
import { api } from '../api.js'

const DEFAULT = `int main() {

  return 0;
}
`

export default function Playground() {
  const [code, setCode] = useState(() => localStorage.getItem('playground-code') || DEFAULT)
  const [stdin, setStdin] = useState('')
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState(null)

  const saveCode = (val) => { setCode(val); localStorage.setItem('playground-code', val) }

  const handleReset = () => {
    if (code !== DEFAULT && !confirm('Reset to blank template?')) return
    saveCode(DEFAULT)
    setOutput(null)
  }

  const handleRun = async () => {
    setRunning(true)
    setOutput(null)
    const out = await api.runPlayground(code, stdin)
    setOutput(out)
    setRunning(false)
  }

  return (
    <div className="playground">
      <div className="playground-header">
        <div className="playground-header-left">
          <span className="playground-title">Playground</span>
          <span className="playground-hint-inline">C++ scratch pad</span>
        </div>
        <button className="playground-reset-btn" onClick={handleReset}>Reset</button>
      </div>
      <div className="playground-code">
        <CodeEditor value={code} onChange={saveCode} minHeight="100%" />
      </div>
      {output && (
        <div className="run-output playground-output">
          {output.stderr && <pre className="run-stderr">{output.stderr}</pre>}
          {output.stdout && <pre className="run-stdout">{output.stdout}</pre>}
          <div className="exit-code">exit {output.exitCode}</div>
        </div>
      )}
      <div className="playground-footer">
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
    </div>
  )
}
