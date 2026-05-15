import { useState, useEffect } from 'react'
import CodeEditor from '../components/CodeEditor.jsx'
import { api } from '../api.js'

const EMPTY_FILE = { name: 'main.cpp', content: '' }

export default function EditorView({ snippetId, onSave, onBack }) {
  const isEdit = Boolean(snippetId)
  const [form, setForm] = useState({ title: '', tags: '', notes: '', files: [{ ...EMPTY_FILE }] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    api.getSnippet(snippetId).then(d => setForm({
      title: d.title,
      tags: d.tags.join(', '),
      notes: d.notes || '',
      files: d.files,
    }))
  }, [snippetId])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const updateFile = (i, field, val) => {
    setForm(f => {
      const files = [...f.files]
      files[i] = { ...files[i], [field]: val }
      return { ...f, files }
    })
  }

  const addFile = () => setForm(f => ({ ...f, files: [...f.files, { name: '', content: '' }] }))
  const removeFile = (i) => setForm(f => ({ ...f, files: f.files.filter((_, idx) => idx !== i) }))

  const handleSave = async () => {
    if (!form.title.trim()) return alert('Title required')
    setSaving(true)
    const body = {
      title: form.title.trim(),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      notes: form.notes,
      files: form.files.filter(f => f.name),
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
          {form.files.map((f, i) => (
            <div key={i} className="file-editor">
              <div className="file-editor-top">
                <input
                  className="file-name-input"
                  placeholder="filename.cpp"
                  value={f.name}
                  onChange={e => updateFile(i, 'name', e.target.value)}
                />
                {form.files.length > 1 && (
                  <button className="remove-file-btn" onClick={() => removeFile(i)}>×</button>
                )}
              </div>
              <CodeEditor
                value={f.content}
                onChange={val => updateFile(i, 'content', val)}
              />
            </div>
          ))}
          <button className="add-file-btn" onClick={addFile}>+ Add file</button>
        </div>
      </div>
    </div>
  )
}
