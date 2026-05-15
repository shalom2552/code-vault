import { useEffect, useRef } from 'react'
import hljs from 'highlight.js/lib/core'
import cpp from 'highlight.js/lib/languages/cpp'
import 'highlight.js/styles/github-dark.css'

hljs.registerLanguage('cpp', cpp)

export default function CodeBlock({ code, filename }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.removeAttribute('data-highlighted')
    hljs.highlightElement(ref.current)
  }, [code])
  return (
    <div className="code-block">
      {filename && <div className="code-filename">{filename}</div>}
      <pre><code ref={ref} className="language-cpp">{code}</code></pre>
    </div>
  )
}
