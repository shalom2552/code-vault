import { useState, useEffect } from 'react'
import CodeEditor from '../components/CodeEditor.jsx'
import { api } from '../api.js'

const uid = () => Math.random().toString(36).slice(2)
const EMPTY_FILE = () => ({ _key: uid(), name: 'main.cpp', content: '' })

export default function EditorView({ snippetId, onSave, onBack }) {
  const isEdit = Boolean(snippetId)
  const [form, setForm] = useState({ title: '', tags: '', notes: '', files: [EMPTY_FILE()] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    let ignored = false
    api.getSnippet(snippetId).then(d => {
      if (ignored) return
      setForm({
        title: d.title,
        tags: d.tags.join(', '),
        notes: d.notes || '',
        files: d.files.map(f => ({ ...f, _key: f.name })),
      })
    })
    return () => { ignored = true }
  }, [snippetId])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const updateFile = (key, field, val) => {
    setForm(f => ({
      ...f,
      files: f.files.map(file => file._key === key ? { ...file, [field]: val } : file),
    }))
  }

  const addFile = () => setForm(f => ({ ...f, files: [...f.files, { _key: uid(), name: '', content: '' }] }))
  const removeFile = (key) => setForm(f => ({ ...f, files: f.files.filter(file => file._key !== key) }))

  const handleSave = async () => {
    if (!form.title.trim()) return alert('Title required')
    setSaving(true)
    const body = {
      title: form.title.trim(),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      notes: form.notes,
      files: form.files
        .filter(f => f.name)
        .map(({ _key, ...f }) => f),
    }
    const saved = isEdit
      ? await api.updateSnippet(snippetId, body)
      : await api.createSnippet(body)
    setSaving(false)
    onSave(saved.id)
  }

  return (
    <div className="editor-view">
      <div className="nav-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <span className="nav-title">{isEdit ? 'Edit' : 'New Snippet'}</span>
        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? '…' : 'Save'}
        </button>
      </div>

      <div className="editor-form">
        <input className="form-input" placeholder="Title" value={form.title} onChange={set('title')} />
        <input className="form-input" placeholder="Tags — comma separated" value={form.tags} onChange={set('tags')} />
        <textarea className="form-textarea" placeholder="Notes (optional)" value={form.notes} onChange={set('notes')} rows={3} />

        <div className="files-section">
          {form.files.map(f => (
            <div key={f._key} className="file-editor">
              <div className="file-editor-top">
                <input
                  className="file-name-input"
                  placeholder="filename.cpp"
                  value={f.name}
                  onChange={e => updateFile(f._key, 'name', e.target.value)}
                />
                {form.files.length > 1 && (
                  <button className="remove-file-btn" onClick={() => removeFile(f._key)}>×</button>
                )}
              </div>
              <CodeEditor
                value={f.content}
                onChange={val => updateFile(f._key, 'content', val)}
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
