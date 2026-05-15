import CodeMirror from '@uiw/react-codemirror'
import { cpp } from '@codemirror/lang-cpp'
import { oneDark } from '@codemirror/theme-one-dark'

const extensions = [cpp()]

export default function CodeEditor({ value, onChange, minHeight = '260px' }) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={oneDark}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: false,
        indentOnInput: true,
        highlightActiveLine: true,
        tabSize: 2,
      }}
      style={{ minHeight, fontSize: '13px' }}
      indentWithTab={true}
    />
  )
}
