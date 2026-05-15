import { useState } from 'react'
import ListView from './views/ListView.jsx'
import DetailView from './views/DetailView.jsx'
import EditorView from './views/EditorView.jsx'
import Playground from './views/Playground.jsx'
import './App.css'

function SnippetsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5,3 19,12 5,21"/>
    </svg>
  )
}

export default function App() {
  const [tab, setTab] = useState('snippets')
  const [view, setView] = useState('list')
  const [selectedId, setSelectedId] = useState(null)

  const goDetail = (id) => { setSelectedId(id); setView('detail') }
  const goList = () => setView('list')
  const goCreate = () => { setSelectedId(null); setView('create') }
  const goEdit = () => setView('edit')

  const inSnippetDetail = tab === 'snippets' && view !== 'list'

  return (
    <div className="app">
      <div className="tab-content">
        {tab === 'snippets' && (
          <>
            {view === 'list' && <ListView onSelect={goDetail} onCreate={goCreate} />}
            {view === 'detail' && <DetailView id={selectedId} onBack={goList} onEdit={goEdit} onDeleted={goList} />}
            {view === 'create' && <EditorView onSave={goDetail} onBack={goList} />}
            {view === 'edit' && <EditorView snippetId={selectedId} onSave={goDetail} onBack={() => setView('detail')} />}
          </>
        )}
        {tab === 'playground' && <Playground />}
      </div>

      {!inSnippetDetail && (
        <nav className="bottom-nav">
          <button className={`nav-item${tab === 'snippets' ? ' active' : ''}`} onClick={() => { setTab('snippets'); setView('list') }}>
            <SnippetsIcon />
            <span className="nav-label">Snippets</span>
          </button>
          <button className={`nav-item${tab === 'playground' ? ' active' : ''}`} onClick={() => setTab('playground')}>
            <PlayIcon />
            <span className="nav-label">Playground</span>
          </button>
        </nav>
      )}
    </div>
  )
}
