import { useState, useEffect } from 'react'
import CodeEditor from '../components/CodeEditor.jsx'
import LoadingSkeleton from '../components/LoadingSkeleton.jsx'
import { useToast } from '../components/ToastContext.jsx'
import { api } from '../api.js'
import { LANGUAGES, DEFAULT_LANGUAGE, getLanguage } from '../languages.js'

const COMPILER_FLAGS = [
  '-O0', '-O1', '-O2', '-O3',
  '-Wall', '-Wextra', '-Werror',
  '-std=c++17', '-std=c++20', '-std=c++23',
  '-std=c11', '-std=c99',
  '-lm', '-lpthread',
  '-g', '-DDEBUG',
]

const makeKey = () => Math.random().toString(36).slice(2, 11)
const emptyFile = (language) => ({ _key: makeKey(), name: getLanguage(language).defaultFile, content: '' })

export default function EditorView({ snippetId, initialData, onSave, onBack }) {
  const isEdit = Boolean(snippetId)
  const { toast } = useToast()
  const [loadingEdit, setLoadingEdit] = useState(isEdit)
  const [form, setForm] = useState(() => {
    const language = initialData?.language ?? DEFAULT_LANGUAGE
    const files = initialData
      ? [{ _key: getLanguage(language).defaultFile, name: getLanguage(language).defaultFile, content: initialData.code }]
      : [emptyFile(language)]
    return { title: '', tags: '', notes: '', language, files, compilerFlags: [] }
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    let ignored = false
    api.getSnippet(snippetId).then(d => {
      if (ignored) return
      setForm({
        title: d.title,
        tags: d.tags.join(', '),
        notes: d.notes || '',
        language: d.language ?? DEFAULT_LANGUAGE,
        files: d.files.map(f => ({ ...f, _key: f.name })),
        compilerFlags: d.compilerFlags ?? [],
      })
      setLoadingEdit(false)
    }).catch(e => {
      if (ignored) return
      setError(`Failed to load snippet: ${e.message}`)
      setLoadingEdit(false)
    })
    return () => { ignored = true }
  }, [snippetId, isEdit])

  const set = (field) => (e) => {
    setError(null)
    setForm(f => ({ ...f, [field]: e.target.value }))
  }

  const handleLanguageChange = (e) => {
    const language = e.target.value
    setForm(f => ({
      ...f,
      language,
      files: f.files.map((file, i) =>
        i === 0 && !isEdit ? { ...file, name: getLanguage(language).defaultFile } : file
      ),
      compilerFlags: [],
    }))
  }

  const toggleFlag = (flag) => {
    setForm(f => ({
      ...f,
      compilerFlags: f.compilerFlags.includes(flag)
        ? f.compilerFlags.filter(fl => fl !== flag)
        : [...f.compilerFlags, flag],
    }))
  }

  const updateFile = (key, field, val) => {
    setForm(f => ({
      ...f,
      files: f.files.map(file => file._key === key ? { ...file, [field]: val } : file),
    }))
  }

  const addFile = () => setForm(f => ({ ...f, files: [...f.files, { _key: makeKey(), name: '', content: '' }] }))
  const removeFile = (key) => setForm(f => ({ ...f, files: f.files.filter(file => file._key !== key) }))

  const handlePaste = async (key) => {
    try {
      const text = await navigator.clipboard.readText()
      updateFile(key, 'content', text)
      toast('Pasted from clipboard', 'success')
    } catch (e) {
      toast(`Paste failed: ${e.message}`, 'error')
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) return setError('Title required')
    setSaving(true)
    setError(null)
    try {
      const body = {
        title: form.title.trim(),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        notes: form.notes,
        language: form.language,
        files: form.files
          .filter(f => f.name)
          .map(({ _key: _, ...f }) => f),
        compilerFlags: form.compilerFlags,
      }
      const saved = isEdit
        ? await api.updateSnippet(snippetId, body)
        : await api.createSnippet(body)
      toast(isEdit ? 'Snippet updated' : 'Snippet created', 'success')
      onSave(saved.id)
    } catch (e) {
      setError(`Save failed: ${e.message}`)
      toast(`Save failed: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loadingEdit) return (
    <div className="editor-view">
      <LoadingSkeleton variant="editor" />
    </div>
  )

  const showFlags = form.language === 'cpp' || form.language === 'c'

  return (
    <div className="editor-view">
      <div className="nav-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <span className="nav-title">{isEdit ? 'Edit' : 'New Snippet'}</span>
        <div className="nav-actions-error">
          {error && <span className="inline-error">{error}</span>}
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? '…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="editor-form">
        <input className="form-input" placeholder="Title" value={form.title} onChange={set('title')} maxLength={100} />
        <input className="form-input" placeholder="Tags — comma separated" value={form.tags} onChange={set('tags')} />
        <textarea className="form-textarea" placeholder="Notes (optional)" value={form.notes} onChange={set('notes')} rows={3} maxLength={5000} />

        <select className="form-select" value={form.language} onChange={handleLanguageChange}>
          {Object.entries(LANGUAGES).map(([id, lang]) => (
            <option key={id} value={id}>{lang.label}</option>
          ))}
        </select>

        {showFlags && (
          <div className="compiler-flags">
            <div className="compiler-flags-label">Compiler flags</div>
            <div className="compiler-flags-grid">
              {COMPILER_FLAGS.map(flag => (
                <label key={flag} className="flag-option">
                  <input
                    type="checkbox"
                    checked={form.compilerFlags.includes(flag)}
                    onChange={() => toggleFlag(flag)}
                  />
                  <span>{flag}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="files-section">
          {form.files.map(f => (
            <div key={f._key} className="file-editor">
              <div className="file-editor-top">
                <input
                  className="file-name-input"
                  placeholder={getLanguage(form.language).defaultFile}
                  value={f.name}
                  onChange={e => updateFile(f._key, 'name', e.target.value)}
                />
                <button 
                  className="action-btn paste-btn" 
                  onClick={() => handlePaste(f._key)}
                  style={{ marginLeft: 'auto', marginRight: '0.5rem', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
                >
                  Paste from clipboard
                </button>
                {form.files.length > 1 && (
                  <button className="remove-file-btn" onClick={() => removeFile(f._key)}>×</button>
                )}
              </div>
              <CodeEditor
                value={f.content}
                onChange={val => updateFile(f._key, 'content', val)}
                language={form.language}
                autoHeight
              />
            </div>
          ))}
          <button className="add-file-btn" onClick={addFile}>+ Add file</button>
        </div>
      </div>
    </div>
  )
}
