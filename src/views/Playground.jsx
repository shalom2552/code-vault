import { useState } from 'react'
import CodeEditor from '../components/CodeEditor.jsx'
import { api } from '../api.js'
import { LANGUAGES, DEFAULT_LANGUAGE, getLanguage } from '../languages.js'

const storageKey = (lang) => `playground-code-${lang}`

export default function Playground() {
  const [language, setLanguage] = useState(() => localStorage.getItem('playground-language') || DEFAULT_LANGUAGE)
  const [code, setCode] = useState(() => {
    const lang = localStorage.getItem('playground-language') || DEFAULT_LANGUAGE
    return localStorage.getItem(storageKey(lang)) || getLanguage(lang).playgroundDefault
  })
  const [stdin, setStdin] = useState('')
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState(null)

  const saveCode = (val) => { setCode(val); localStorage.setItem(storageKey(language), val) }

  const handleLanguageChange = (e) => {
    const lang = e.target.value
    setLanguage(lang)
    localStorage.setItem('playground-language', lang)
    const saved = localStorage.getItem(storageKey(lang))
    setCode(saved || getLanguage(lang).playgroundDefault)
    setOutput(null)
  }

  const handleReset = () => {
    const def = getLanguage(language).playgroundDefault
    if (code !== def && !confirm('Reset to blank template?')) return
    saveCode(def)
    setOutput(null)
  }

  const handleRun = async () => {
    setRunning(true)
    setOutput(null)
    const out = await api.runPlayground(code, stdin, language)
    setOutput(out)
    setRunning(false)
  }

  return (
    <div className="playground">
      <div className="playground-header">
        <div className="playground-header-left">
          <span className="playground-title">Playground</span>
          <span className="playground-hint-inline">{LANGUAGES[language]?.label ?? language} scratch pad</span>
        </div>
        <div className="playground-header-right">
          <select className="form-select playground-lang-select" value={language} onChange={handleLanguageChange}>
            {Object.entries(LANGUAGES).map(([id, lang]) => (
              <option key={id} value={id}>{lang.label}</option>
            ))}
          </select>
          <button className="playground-reset-btn" onClick={handleReset}>Reset</button>
        </div>
      </div>
      <div className="playground-code">
        <CodeEditor value={code} onChange={saveCode} language={language} minHeight="100%" />
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
