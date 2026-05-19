import { useState, lazy, Suspense } from 'react'
import ListView from './views/ListView.jsx'
import './App.css'

const DetailView = lazy(() => import('./views/DetailView.jsx'))
const EditorView = lazy(() => import('./views/EditorView.jsx'))
const Playground = lazy(() => import('./views/Playground.jsx'))

const VIEWS = {
  LIST: 'list',
  DETAIL: 'detail',
  CREATE: 'create',
  EDIT: 'edit',
  EDIT_FROM_LIST: 'editFromList'
}

const TABS = {
  SNIPPETS: 'snippets',
  PLAYGROUND: 'playground'
}

function SnippetsIcon() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5,3 19,12 5,21"/>
    </svg>
  )
}

export default function App() {
  const [tab, setTab] = useState(TABS.SNIPPETS)
  const [view, setView] = useState(VIEWS.LIST)
  const [selectedId, setSelectedId] = useState(null)
  const [playgroundSeed, setPlaygroundSeed] = useState(null)

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

  const inSnippetDetail = tab === TABS.SNIPPETS && view !== VIEWS.LIST

  return (
    <div className="app">
      <div className="tab-content">
        <Suspense fallback={<div className="view-loader">Loading...</div>}>
          {tab === TABS.SNIPPETS && (
            <>
              {view === VIEWS.LIST && <ListView onSelect={goDetail} onCreate={goCreate} onEdit={goEditFromList} />}
              {view === VIEWS.DETAIL && <DetailView id={selectedId} onBack={goList} onEdit={goEdit} onDeleted={goList} />}
              {view === VIEWS.CREATE && (
                <EditorView
                  initialData={playgroundSeed}
                  onSave={goDetail}
                  onBack={playgroundSeed ? goPlayground : goList}
                />
              )}
              {view === VIEWS.EDIT && <EditorView snippetId={selectedId} onSave={goDetail} onBack={() => setView(VIEWS.DETAIL)} />}
              {view === VIEWS.EDIT_FROM_LIST && <EditorView snippetId={selectedId} onSave={goDetail} onBack={goList} />}
            </>
          )}
          {tab === TABS.PLAYGROUND && <Playground onSaveAsSnippet={goCreateFromPlayground} />}
        </Suspense>
      </div>

      {!inSnippetDetail && (
        <nav className="bottom-nav">
          <button
            className={`nav-item${tab === TABS.SNIPPETS ? ' active' : ''}`}
            onClick={() => { setTab(TABS.SNIPPETS); setView(VIEWS.LIST) }}
            aria-label="Snippets"
          >
            <SnippetsIcon />
            <span className="nav-label">Snippets</span>
          </button>
          <button
            className={`nav-item${tab === TABS.PLAYGROUND ? ' active' : ''}`}
            onClick={() => setTab(TABS.PLAYGROUND)}
            aria-label="Playground"
          >
            <PlayIcon />
            <span className="nav-label">Playground</span>
          </button>
        </nav>
      )}
    </div>
  )
}
