import { memo, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { cpp } from '@codemirror/lang-cpp'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { go } from '@codemirror/lang-go'
import { rust } from '@codemirror/lang-rust'
import { java } from '@codemirror/lang-java'
import { php } from '@codemirror/lang-php'
import { markdown } from '@codemirror/lang-markdown'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { ruby } from '@codemirror/legacy-modes/mode/ruby'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView, keymap } from '@codemirror/view'
import { Prec } from '@codemirror/state'

const autoHeightTheme = EditorView.theme({
  '&': { height: 'auto' },
  '.cm-scroller': { overflowX: 'auto', overflowY: 'visible', minHeight: '100px' },
  '.cm-content': { minHeight: '100px' },
})

// Stable module-level references — prevents CodeMirror reinit on re-render
const CPP_EXT = cpp()
const PYTHON_EXT = python()
const BASH_EXT = StreamLanguage.define(shell)
const JS_EXT = javascript()
const TS_EXT = javascript({ typescript: true })
const GO_EXT = go()
const RUST_EXT = rust()
const JAVA_EXT = java()
const PHP_EXT = php()
const RUBY_EXT = StreamLanguage.define(ruby)
const MARKDOWN_EXT = markdown()

const BASE_EXTENSIONS = {
  cpp: [CPP_EXT],
  c: [CPP_EXT],
  python: [PYTHON_EXT],
  bash: [BASH_EXT],
  javascript: [JS_EXT],
  typescript: [TS_EXT],
  go: [GO_EXT],
  rust: [RUST_EXT],
  java: [JAVA_EXT],
  ruby: [RUBY_EXT],
  php: [PHP_EXT],
  markdown: [MARKDOWN_EXT],
  text: [],
}

const AUTO_HEIGHT_EXTENSIONS = {
  cpp: [CPP_EXT, autoHeightTheme],
  c: [CPP_EXT, autoHeightTheme],
  python: [PYTHON_EXT, autoHeightTheme],
  bash: [BASH_EXT, autoHeightTheme],
  javascript: [JS_EXT, autoHeightTheme],
  typescript: [TS_EXT, autoHeightTheme],
  go: [GO_EXT, autoHeightTheme],
  rust: [RUST_EXT, autoHeightTheme],
  java: [JAVA_EXT, autoHeightTheme],
  ruby: [RUBY_EXT, autoHeightTheme],
  php: [PHP_EXT, autoHeightTheme],
  markdown: [MARKDOWN_EXT, autoHeightTheme],
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
  tabSize: 4,
}

function CodeEditor({ value, onChange, minHeight = '260px', autoHeight = false, language = 'cpp', fontSize = 14, onCtrlEnter }) {
  const baseExtensions = autoHeight
    ? (AUTO_HEIGHT_EXTENSIONS[language] ?? AUTO_HEIGHT_EXTENSIONS.text)
    : (BASE_EXTENSIONS[language] ?? BASE_EXTENSIONS.text)

  const extensions = useMemo(() => {
    if (!onCtrlEnter) return baseExtensions
    const ctrlEnterKeymap = Prec.highest(keymap.of([{
      key: 'Mod-Enter',
      run: () => { onCtrlEnter(); return true },
    }]))
    return [...baseExtensions, ctrlEnterKeymap]
  }, [baseExtensions, onCtrlEnter])

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
