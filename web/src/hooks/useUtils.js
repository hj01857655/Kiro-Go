import { useEffect } from 'react'

export function useDebounce(callback, delay, deps = []) {
  useEffect(() => {
    const handler = setTimeout(() => {
      callback()
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [delay, ...deps])
}

export function useKeyboardShortcut(key, callback, modifiers = {}) {
  useEffect(() => {
    const handler = (e) => {
      const { ctrl, shift, alt } = modifiers

      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        (!ctrl || e.ctrlKey || e.metaKey) &&
        (!shift || e.shiftKey) &&
        (!alt || e.altKey)
      ) {
        e.preventDefault()
        callback(e)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [key, callback, modifiers])
}
