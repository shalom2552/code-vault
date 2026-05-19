import { useEffect, useRef, memo } from 'react'
import hljs from 'highlight.js/lib/core'
import cpp from 'highlight.js/lib/languages/cpp'
import c from 'highlight.js/lib/languages/c'
import python from 'highlight.js/lib/languages/python'
import 'highlight.js/styles/github-dark.css'

hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('c', c)
hljs.registerLanguage('python', python)

function CodeBlock({ code, filename, language = 'cpp' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.removeAttribute('data-highlighted')
    hljs.highlightElement(ref.current)
  }, [code, language])
  return (
    <div className="code-block">
      {filename && <div className="code-filename">{filename}</div>}
      <pre><code ref={ref} className={`language-${language}`}>{code}</code></pre>
    </div>
  )
}

export default memo(CodeBlock)
