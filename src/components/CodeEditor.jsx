import CodeMirror from '@uiw/react-codemirror'
import { cpp } from '@codemirror/lang-cpp'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'

const autoHeightTheme = EditorView.theme({
  '&': { height: 'auto' },
  '.cm-scroller': { overflow: 'visible', minHeight: '100px' },
  '.cm-content': { minHeight: '100px' },
})

const baseExtensions = [cpp()]
const autoHeightExtensions = [cpp(), autoHeightTheme]

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

export default function CodeEditor({ value, onChange, minHeight = '260px', autoHeight = false }) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={autoHeight ? autoHeightExtensions : baseExtensions}
      theme={oneDark}
      basicSetup={SETUP}
      style={autoHeight ? { fontSize: '13px' } : { minHeight, fontSize: '13px' }}
      indentWithTab={true}
    />
  )
}
