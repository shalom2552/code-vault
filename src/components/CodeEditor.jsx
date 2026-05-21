import { memo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { cpp } from '@codemirror/lang-cpp'
import { python } from '@codemirror/lang-python'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
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
const BASH_EXT = StreamLanguage.define(shell)

const BASE_EXTENSIONS = {
  cpp: [CPP_EXT],
  c: [CPP_EXT],
  python: [PYTHON_EXT],
  bash: [BASH_EXT],
  text: [],
}

const AUTO_HEIGHT_EXTENSIONS = {
  cpp: [CPP_EXT, autoHeightTheme],
  c: [CPP_EXT, autoHeightTheme],
  python: [PYTHON_EXT, autoHeightTheme],
  bash: [BASH_EXT, autoHeightTheme],
  text: [autoHeightTheme],
}

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

function CodeEditor({ value, onChange, minHeight = '260px', autoHeight = false, language = 'cpp', fontSize = 14 }) {
  const extensions = autoHeight
    ? (AUTO_HEIGHT_EXTENSIONS[language] ?? AUTO_HEIGHT_EXTENSIONS.text)
    : (BASE_EXTENSIONS[language] ?? BASE_EXTENSIONS.text)

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={oneDark}
      basicSetup={SETUP}
      style={autoHeight ? { fontSize: `${fontSize}px` } : { minHeight, fontSize: `${fontSize}px` }}
      indentWithTab={true}
    />
  )
}

export default memo(CodeEditor)
