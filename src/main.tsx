import { createRoot } from 'react-dom/client'
import './index.css'

const root = createRoot(document.getElementById('root')!)

// Checked here, before anything that transitively imports lib/supabase.ts,
// so a missing/misconfigured .env.local shows a clear on-screen message
// instead of a silent blank page from a module-load-time throw.
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  root.render(
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 480 }}>
      <h1 style={{ fontSize: 20 }}>Missing Supabase configuration</h1>
      <p>
        Copy <code>.env.example</code> to <code>.env.local</code> and fill in{' '}
        <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code> from your Supabase
        project's Settings → API page, then restart the dev server.
      </p>
    </div>,
  )
} else {
  import('./AppRoot').then(({ AppRoot }) => root.render(<AppRoot />))
}
