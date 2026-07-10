import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="animate-fade-in-up flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <h1 className="text-2xl font-bold text-slate-800">Page not found</h1>
      <Link to="/" className="text-sm text-slate-400 underline">
        Go home
      </Link>
    </div>
  )
}
