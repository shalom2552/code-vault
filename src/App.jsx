import { useState, lazy, Suspense } from 'react'
import ListView from './views/ListView.jsx'
import EmptyState from './components/EmptyState.jsx'
import { ToastProvider } from './components/ToastContext.jsx'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js'
import './App.css'

const DetailView = lazy(() => import('./views/DetailView.jsx'))
const EditorView = lazy(() => import('./views/EditorView.jsx'))
const Playground = lazy(() => import('./views/Playground.jsx'))

const VIEWS = {
  LIST: 'list',
  DETAIL: 'detail',
  CREATE: 'create',
  EDIT: 'edit',
  EDIT_FROM_LIST: 'editFromList',
}

const TABS = {
  SNIPPETS: 'snippets',
  PLAYGROUND: 'playground',
}

const FONT_SIZES = [12, 14, 16]

function SnippetsIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5,3 19,12 5,21"/>
    </svg>
  )
}

export default function App() {
  const [tab, setTab] = useState(TABS.SNIPPETS)
  const [view, setView] = useState(VIEWS.LIST)
  const [selectedId, setSelectedId] = useState(null)
  const [playgroundSeed, setPlaygroundSeed] = useState(null)
  const [fontSize, setFontSize] = useState(() => {
    const stored = parseInt(localStorage.getItem('code-font-size'))
    return FONT_SIZES.includes(stored) ? stored : 14
  })

  const cycleFont = () => {
    const next = FONT_SIZES[(FONT_SIZES.indexOf(fontSize) + 1) % FONT_SIZES.length]
    setFontSize(next)
    localStorage.setItem('code-font-size', String(next))
  }

  const goDetail = (id) => { setSelectedId(id); setView(VIEWS.DETAIL); setPlaygroundSeed(null) }
  const goList = () => { setView(VIEWS.LIST); setPlaygroundSeed(null) }
  const goCreate = () => { setSelectedId(null); setView(VIEWS.CREATE) }
  const goEdit = () => setView(VIEWS.EDIT)
  const goEditFromList = (id) => { setSelectedId(id); setView(VIEWS.EDIT_FROM_LIST) }
  const goPlayground = () => { setTab(TABS.PLAYGROUND); setPlaygroundSeed(null) }

  const goCreateFromPlayground = (code, language) => {
    setPlaygroundSeed({ code, language })
    setSelectedId(null)
    setTab(TABS.SNIPPETS)
    setView(VIEWS.CREATE)
  }

  const isSnippets = tab === TABS.SNIPPETS
  const isPlayground = tab === TABS.PLAYGROUND
  const isInEditor = isSnippets && (view === VIEWS.CREATE || view === VIEWS.EDIT || view === VIEWS.EDIT_FROM_LIST)
  const isInDetail = isSnippets && view === VIEWS.DETAIL
  const showingList = isSnippets && view === VIEWS.LIST
  const inSnippetDetail = isSnippets && view !== VIEWS.LIST

  const handleBack = () => {
    if (view === VIEWS.EDIT) { setView(VIEWS.DETAIL); return }
    if (view === VIEWS.CREATE || view === VIEWS.EDIT_FROM_LIST) {
      if (playgroundSeed) { goPlayground(); return }
      goList(); return
    }
    if (view === VIEWS.DETAIL) goList()
  }

  useKeyboardShortcuts({
    isInEditor,
    isInDetail,
    isInPlayground,
    onBack: handleBack,
  })

  return (
    <ToastProvider>
      <div className={`app font-size-${fontSize}`}>

        {/* Left pane — ListView, persistent on desktop, active-only on mobile */}
        <div className={`list-pane${showingList ? '' : ' list-pane-mobile-hidden'}`}>
          <div className="desktop-bar">
            <div className="desktop-tabs">
              <button
                className={`desktop-tab${isSnippets ? ' active' : ''}`}
                onClick={() => { setTab(TABS.SNIPPETS); setView(VIEWS.LIST) }}
              >
                <SnippetsIcon />
                Snippets
              </button>
              <button
                className={`desktop-tab${isPlayground ? ' active' : ''}`}
                onClick={goPlayground}
              >
                <PlayIcon />
                Playground
              </button>
            </div>
            <button className="font-toggle-btn" onClick={cycleFont} title={`Font size: ${fontSize}px — click to cycle`}>
              Aa<span className="font-size-label">{fontSize}</span>
            </button>
          </div>
          <ListView onSelect={goDetail} onCreate={goCreate} onEdit={goEditFromList} />
        </div>

        {/* Right / main pane */}
        <div className={`main-pane${showingList ? ' main-pane-mobile-hidden' : ''}`}>
          <Suspense fallback={<div className="view-loader">Loading…</div>}>
            {isSnippets && view === VIEWS.DETAIL && (
              <DetailView id={selectedId} onBack={goList} onEdit={goEdit} onDeleted={goList} />
            )}
            {isSnippets && view === VIEWS.CREATE && (
              <EditorView
                initialData={playgroundSeed}
                onSave={goDetail}
                onBack={playgroundSeed ? goPlayground : goList}
              />
            )}
            {isSnippets && view === VIEWS.EDIT && (
              <EditorView snippetId={selectedId} onSave={goDetail} onBack={() => setView(VIEWS.DETAIL)} />
            )}
            {isSnippets && view === VIEWS.EDIT_FROM_LIST && (
              <EditorView snippetId={selectedId} onSave={goDetail} onBack={goList} />
            )}
            {isPlayground && <Playground onSaveAsSnippet={goCreateFromPlayground} />}
            {isSnippets && view === VIEWS.LIST && (
              <div className="detail-empty">
                <EmptyState
                  title="Select a snippet"
                  subtitle="Choose a snippet from the list to view it here."
                />
              </div>
            )}
          </Suspense>
        </div>

        {/* Mobile bottom nav — hidden on desktop via CSS */}
        {!inSnippetDetail && (
          <nav className="bottom-nav">
            <button
              className={`nav-item${isSnippets ? ' active' : ''}`}
              onClick={() => { setTab(TABS.SNIPPETS); setView(VIEWS.LIST) }}
              aria-label="Snippets"
            >
              <SnippetsIcon />
              <span className="nav-label">Snippets</span>
            </button>
            <button
              className={`nav-item${isPlayground ? ' active' : ''}`}
              onClick={goPlayground}
              aria-label="Playground"
            >
              <PlayIcon />
              <span className="nav-label">Playground</span>
            </button>
            <button className="nav-item" onClick={cycleFont} aria-label={`Font size ${fontSize}px`}>
              <span className="font-toggle-label">Aa</span>
              <span className="nav-label">{fontSize}px</span>
            </button>
          </nav>
        )}

      </div>
    </ToastProvider>
  )
}
