import { useEffect, useRef } from 'react'

export function useKeyboardShortcuts({ isInEditor, isInDetail, isInPlayground, onBack }) {
  const onBackRef = useRef(onBack)
  useEffect(() => { onBackRef.current = onBack })

  useEffect(() => {
    const handler = (e) => {
      const active = document.activeElement
      const inTextInput = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA'
      const inCodeEditor = Boolean(active?.closest('.cm-editor'))

      // / → focus search when not typing anywhere
      if (e.key === '/' && !inTextInput && !inCodeEditor && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        document.querySelector('.search-input')?.focus()
        return
      }

      // Ctrl+S → trigger save button in editor
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && isInEditor) {
        e.preventDefault()
        document.querySelector('.save-btn:not([disabled])')?.click()
        return
      }

      // Ctrl+Enter → trigger run button in detail or playground
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && (isInDetail || isInPlayground)) {
        e.preventDefault()
        document.querySelector('.playground-run-btn:not([disabled])')?.click()
        return
      }

      // Esc → go back (not when typing)
      if (e.key === 'Escape' && !inTextInput && !inCodeEditor) {
        onBackRef.current?.()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isInEditor, isInDetail, isInPlayground])
}
