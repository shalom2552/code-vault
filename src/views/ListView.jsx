import { useState, useEffect } from 'react'
import { api } from '../api.js'
import { LANGUAGES, DEFAULT_LANGUAGE } from '../languages.js'

export default function ListView({ onSelect, onCreate }) {
  const [snippets, setSnippets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState(null)

  const load = () => {
    setLoading(true)
    api.listSnippets()
      .then(d => { setSnippets(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(load, [])

  const allTags = [...new Set(snippets.flatMap(s => s.tags))].sort()
  const q = search.toLowerCase()
  const filtered = snippets.filter(s => {
    const matchSearch = !q || s.title.toLowerCase().includes(q) || s.tags.some(t => t.includes(q)) || (s.notes || '').toLowerCase().includes(q)
    const matchTag = !activeTag || s.tags.includes(activeTag)
    return matchSearch && matchTag
  })

  return (
    <div className="list-view">
      <div className="list-header">
        <div className="list-top">
          <h1 className="app-title">CppVault</h1>
          <span className="snippet-count">{snippets.length}</span>
        </div>
        <input
          className="search-input"
          placeholder="Search snippets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {allTags.length > 0 && (
          <div className="tags-bar">
            {allTags.map(tag => (
              <button
                key={tag}
                className={`tag-chip${activeTag === tag ? ' active' : ''}`}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              >{tag}</button>
            ))}
          </div>
        )}
      </div>

      <div className="snippets-list">
        {loading
          ? <div className="empty">Loading...</div>
          : filtered.length === 0
            ? <div className="empty">{search || activeTag ? 'No matches' : 'No snippets yet'}</div>
            : filtered.map(s => (
              <div key={s.id} className="snippet-card" onClick={() => onSelect(s.id)}>
                <div className="card-title">{s.title}</div>
                <div className="card-meta">
                  <span className="card-files">{s.files.length} file{s.files.length !== 1 ? 's' : ''}</span>
                  <span className="card-lang">{LANGUAGES[s.language ?? DEFAULT_LANGUAGE]?.label ?? s.language}</span>
                  <div className="card-tags">
                    {s.tags.map(t => <span key={t} className="card-tag">{t}</span>)}
                  </div>
                </div>
              </div>
            ))
        }
      </div>

      <button className="fab" onClick={onCreate}>+</button>
    </div>
  )
}
