import { useCallback, useEffect, useRef, useState } from 'react'

// Loads data once on mount (and whenever `deps` change). `reload()` fetches again.
export function useApi(load, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true })
  const ticket = useRef(0)
  const loadRef = useRef(load)
  loadRef.current = load

  const run = useCallback(() => {
    const mine = ++ticket.current
    setState((s) => ({ ...s, loading: true, error: '' }))
    loadRef.current().then(
      (data) => mine === ticket.current && setState({ data, error: '', loading: false }),
      (e) => mine === ticket.current && setState((s) => ({ data: s.data, error: e.message || 'Something went wrong.', loading: false })),
    )
  }, [])

  useEffect(() => {
    run()
    return () => {
      ticket.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ...state, reload: run }
}
