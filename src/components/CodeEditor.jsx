import { memo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { cpp } from '@codemirror/lang-cpp'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'

const autoHeightTheme = EditorView.theme({
  '&': { height: 'auto' },
  '.cm-scroller': { overflow: 'visible', minHeight: '100px' },
  '.cm-content': { minHeight: '100px' },
})

// Stable module-level references — prevents CodeMirror reinit on re-render
const CPP_EXT = cpp()
const PYTHON_EXT = python()

const BASE_EXTENSIONS = {
  cpp: [CPP_EXT],
  c: [CPP_EXT],
  python: [PYTHON_EXT],
}
const AUTO_HEIGHT_EXTENSIONS = {
  cpp: [CPP_EXT, autoHeightTheme],
  c: [CPP_EXT, autoHeightTheme],
  python: [PYTHON_EXT, autoHeightTheme],
}
const FALLBACK_BASE = BASE_EXTENSIONS.cpp
const FALLBACK_AUTO = AUTO_HEIGHT_EXTENSIONS.cpp

const SETUP = {
  lineNumbers: true,
  foldGutter: false,
  bracketMatching: true,
  closeBrackets: true,
  autocompletion: false,
  indentOnInput: true,
  highlightActiveLine: true,
  tabSize: 2,
}

function CodeEditor({ value, onChange, minHeight = '260px', autoHeight = false, language = 'cpp' }) {
  const extensions = autoHeight
    ? (AUTO_HEIGHT_EXTENSIONS[language] ?? FALLBACK_AUTO)
    : (BASE_EXTENSIONS[language] ?? FALLBACK_BASE)
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={oneDark}
      basicSetup={SETUP}
      style={autoHeight ? { fontSize: '13px' } : { minHeight, fontSize: '13px' }}
      indentWithTab={true}
    />
  )
}

export default memo(CodeEditor)
