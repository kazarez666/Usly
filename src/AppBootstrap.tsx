import { useEffect, useState } from 'react'
import App from './App'
import { supabase } from './lib/supabase'
import { getMyCouple } from './lib/couples'

export default function AppBootstrap() {
  const [checked, setChecked] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [showApp, setShowApp] = useState(false)

  useEffect(() => {
    let active = true

    const prepare = async () => {
      if (!supabase) {
        if (!active) return
        setChecked(true)
        setShowApp(true)
        return
      }

      const { data } = await supabase.auth.getSession()
      if (!active) return

      const hasSession = Boolean(data.session)
      setAuthenticated(hasSession)

      // Warm the couple summary once. App's own restoration reuses the tiny
      // in-memory cache instead of repeating the same network chain.
      if (hasSession) await getMyCouple()
      if (!active) return

      setChecked(true)
      if (!hasSession) setShowApp(true)
    }

    void prepare()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!checked || !authenticated || showApp) return

    const root = document.getElementById('root')
    if (!root) return

    const checkReady = () => {
      if (root.querySelector('.app-shell, .setup-page')) setShowApp(true)
    }

    checkReady()
    const observer = new MutationObserver(checkReady)
    observer.observe(root, { childList: true, subtree: true })
    const fallback = window.setTimeout(() => setShowApp(true), 5000)

    return () => {
      observer.disconnect()
      window.clearTimeout(fallback)
    }
  }, [checked, authenticated, showApp])

  return (
    <>
      {checked && (
        <div style={{ visibility: showApp ? 'visible' : 'hidden' }}>
          <App />
        </div>
      )}

      {!showApp && (
        <div
          aria-label="Usly loading"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--us-bg, #0d0a12)',
            color: 'var(--us-text, #f8f4ff)',
          }}
        >
          <div style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 28, lineHeight: 1 }}>♥</div>
            <strong style={{ fontSize: 20, letterSpacing: '-0.03em' }}>Usly</strong>
            <small style={{ opacity: 0.55, fontSize: 11 }}>Загружаем ваше пространство…</small>
          </div>
        </div>
      )}
    </>
  )
}
