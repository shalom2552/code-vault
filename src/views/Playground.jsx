import { useState, useEffect } from 'react'
import CodeEditor from '../components/CodeEditor.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import LoadingSkeleton from '../components/LoadingSkeleton.jsx'
import { useToast } from '../components/ToastContext.jsx'
import { api } from '../api.js'
import { LANGUAGES, DEFAULT_LANGUAGE, getLanguage } from '../languages.js'

const storageKey = (lang) => `playground-code-${lang}`

export default function Playground({ onSaveAsSnippet, fontSize = 14, cycleFont }) {
  const { toast } = useToast()
  const [language, setLanguage] = useState(() => localStorage.getItem('playground-language') || DEFAULT_LANGUAGE)
  const [code, setCode] = useState(() => {
    const lang = localStorage.getItem('playground-language') || DEFAULT_LANGUAGE
    return localStorage.getItem(storageKey(lang)) || getLanguage(lang).playgroundDefault
  })
  const [stdin, setStdin] = useState('')
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState(null)
  const [error, setError] = useState(null)
  const [confirmingReset, setConfirmingReset] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(storageKey(language), code)
    }, 500)
    return () => clearTimeout(timer)
  }, [code, language])

  const saveCode = (val) => {
    setCode(val)
    setError(null)
  }

  const handleLanguageChange = (e) => {
    const lang = e.target.value
    setLanguage(lang)
    localStorage.setItem('playground-language', lang)
    const saved = localStorage.getItem(storageKey(lang))
    setCode(saved || getLanguage(lang).playgroundDefault)
    setOutput(null)
    setError(null)
  }

  const handleReset = () => {
    const def = getLanguage(language).playgroundDefault
    if (code === def) return
    setConfirmingReset(true)
  }

  const confirmReset = () => {
    const def = getLanguage(language).playgroundDefault
    saveCode(def)
    localStorage.setItem(storageKey(language), def)
    setOutput(null)
    setConfirmingReset(false)
  }

  const handleRun = async () => {
    setRunning(true)
    setOutput(null)
    setError(null)
    try {
      const out = await api.runPlayground(code, stdin, language)
      setOutput(out)
      if (out.exitCode === 0) {
        toast('Run completed successfully', 'success')
      } else {
        toast(`Run failed with exit code ${out.exitCode}`, 'error')
      }
    } catch (e) {
      setError(`Run failed: ${e.message}`)
      toast(`Run failed: ${e.message}`, 'error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="playground">
      <div className="playground-header">
        <div className="playground-header-left">
          <span className="playground-title">Playground</span>
          <span className="playground-hint-inline">{LANGUAGES[language]?.label ?? language} scratch pad</span>
        </div>
        <div className="playground-header-right">
          {cycleFont && (
            <button className="font-aa-btn" onClick={cycleFont} title={`Font: ${fontSize}px — click to cycle`}>
              Aa
            </button>
          )}
          <select className="form-select playground-lang-select" value={language} onChange={handleLanguageChange}>
            {Object.entries(LANGUAGES).map(([id, lang]) => (
              <option key={id} value={id}>{lang.label}</option>
            ))}
          </select>
          <button className="playground-reset-btn" onClick={handleReset}>Reset</button>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="playground-code">
        <CodeEditor value={code} onChange={saveCode} language={language} minHeight="100%" fontSize={fontSize} />
      </div>

      {running && (
        <div className="run-output playground-output">
          <LoadingSkeleton variant="detail" />
        </div>
      )}

      {!running && output && (
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
          {running ? <><span className="spinner" /> Running…</> : '▶ Run'}
        </button>
        <button
          className="playground-save-btn"
          onClick={() => onSaveAsSnippet(code, language)}
          disabled={code === getLanguage(language).playgroundDefault}
        >Save</button>
      </div>

      {confirmingReset && (
        <ConfirmDialog
          message="Reset to blank template?"
          onConfirm={confirmReset}
          onCancel={() => setConfirmingReset(false)}
        />
      )}
    </div>
  )
}
