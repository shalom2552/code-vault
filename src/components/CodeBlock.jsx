import { memo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { cpp } from '@codemirror/lang-cpp'
import { python } from '@codemirror/lang-python'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'

const readOnlyTheme = EditorView.theme({
  '&': { height: 'auto' },
  '.cm-scroller': { overflow: 'visible' },
  '.cm-content': { padding: '16px 0' },
  '.cm-line': { padding: '0 16px' },
})

const extensionsMap = {
  cpp: [cpp()],
  c: [cpp()],
  python: [python()],
  bash: [StreamLanguage.define(shell)],
  text: [],
}

function CodeBlock({ code, filename, language = 'cpp', fontSize = 14 }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const extensions = [
    ...(extensionsMap[language] || extensionsMap.text),
    readOnlyTheme,
    EditorView.editable.of(false),
  ]

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        {filename && <div className="code-filename">{filename}</div>}
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <CodeMirror
        value={code}
        extensions={extensions}
        theme={oneDark}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
        }}
        style={{ fontSize: `${fontSize}px` }}
        readOnly={true}
      />
    </div>
  )
}

export default memo(CodeBlock)
