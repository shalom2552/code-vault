import { useState, useEffect, useRef, useMemo } from 'react'
import { api } from '../api.js'
import { LANGUAGES, DEFAULT_LANGUAGE } from '../languages.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

export default function ListView({ onSelect, onCreate, onEdit }) {
  const [snippets, setSnippets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [menuSnippet, setMenuSnippet] = useState(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const pressTimer = useRef(null)
  const didLongPress = useRef(false)
  const pressPos = useRef({ x: 0, y: 0 })
  const menuRef = useRef(null)
  const menuTriggerRef = useRef(null)

  const load = () => {
    setLoading(true)
    setError(null)
    api.listSnippets()
      .then(d => {
        setSnippets(d)
        setLoading(false)
      })
      .catch(e => {
        setError(`Failed to load snippets: ${e.message}`)
        setLoading(false)
      })
  }

  useEffect(load, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 150)
    return () => clearTimeout(timer)
  }, [search])

  // P34: focus trap + keyboard nav for context menu
  useEffect(() => {
    if (!menuSnippet || !menuRef.current) return
    const focusable = Array.from(menuRef.current.querySelectorAll('button'))
    focusable[0]?.focus()
    const handleKey = (e) => {
      if (e.key === 'Escape') { setMenuSnippet(null); return }
      if (e.key === 'Tab' && focusable.length > 1) {
        const first = focusable[0], last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      menuTriggerRef.current?.focus()
    }
  }, [menuSnippet])

  const openMenu = (s, e) => {
    e.stopPropagation()
    menuTriggerRef.current = e.currentTarget
    const rect = e.currentTarget.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const menuW = 160
    const menuH = 96
    setMenuPos({
      x: Math.min(rect.left, vw - menuW - 8),
      y: Math.min(rect.bottom + 4, vh - menuH - 8),
    })
    setMenuSnippet(s)
  }

  const startPress = (s, e) => {
    pressPos.current = { x: e.clientX, y: e.clientY }
    didLongPress.current = false
    pressTimer.current = setTimeout(() => {
      didLongPress.current = true
      const vw = window.innerWidth
      const vh = window.innerHeight
      const menuW = 160
      const menuH = 96
      setMenuPos({
        x: Math.min(pressPos.current.x, vw - menuW - 8),
        y: Math.min(pressPos.current.y, vh - menuH - 8),
      })
      setMenuSnippet(s)
    }, 500)
  }

  const cancelPress = () => clearTimeout(pressTimer.current)

  const handleCardClick = (id) => {
    if (didLongPress.current) return
    onSelect(id)
  }

  const [confirmTarget, setConfirmTarget] = useState(null)

  const handleDelete = async () => {
    try {
      setError(null)
      await api.deleteSnippet(confirmTarget.id)
      setConfirmTarget(null)
      setMenuSnippet(null)
      load()
    } catch (e) {
      setError(`Delete failed: ${e.message}`)
    }
  }

  const allTags = useMemo(() =>
    [...new Set(snippets.flatMap(s => s.tags))].sort(),
    [snippets]
  )

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase()
    return snippets.filter(s => {
      const matchSearch = !q ||
        s.title.toLowerCase().includes(q) ||
        s.tags.some(t => t.includes(q)) ||
        (s.notes || '').toLowerCase().includes(q)
      const matchTag = !activeTag || s.tags.includes(activeTag)
      return matchSearch && matchTag
    })
  }, [snippets, debouncedSearch, activeTag])

  return (
    <div className="list-view">
      <div className="list-header">
        <div className="list-top">
          <h1 className="app-title">CodeVault</h1>
          <span className="snippet-count">{snippets.length}</span>
        </div>
        <input
          className="search-input"
          placeholder="Search snippets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {error && <div className="error-banner">{error}</div>}
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
              <div
                key={s.id}
                className="snippet-card"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(s.id) } }}
                onPointerDown={(e) => startPress(s, e)}
                onPointerUp={cancelPress}
                onPointerLeave={cancelPress}
                onPointerCancel={cancelPress}
                onClick={() => handleCardClick(s.id)}
              >
                <div className="card-top">
                  <div className="card-title">{s.title}</div>
                  <button className="card-menu-btn" onClick={(e) => openMenu(s, e)} aria-label="Options">⋮</button>
                </div>
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

      {confirmTarget && (
        <ConfirmDialog
          message={`Delete "${confirmTarget.title}"?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      {menuSnippet && (
        <div className="ctx-overlay" onClick={() => setMenuSnippet(null)}>
          <div className="ctx-menu" ref={menuRef} style={{ left: menuPos.x, top: menuPos.y }} onClick={e => e.stopPropagation()}>
            <button className="ctx-item" onClick={() => { setMenuSnippet(null); onEdit(menuSnippet.id) }}>Edit</button>
            <button className="ctx-item ctx-item-danger" onClick={() => setConfirmTarget(menuSnippet)}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
