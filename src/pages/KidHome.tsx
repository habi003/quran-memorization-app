import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Kid } from '../types/database'
import { AVATAR_ICONS } from '../lib/avatarIcons'
import { getTheme } from '../lib/themes'
import { AvatarPicker } from '../components/AvatarPicker'
import { ThemePicker } from '../components/ThemePicker'
import { LoadingScreen } from '../components/LoadingScreen'
import { BackButton } from '../components/BackButton'
import { playTap, playSuccess } from '../lib/sounds'

export function KidHome() {
  const { kidId } = useParams()
  const navigate = useNavigate()
  const [kid, setKid] = useState<Kid | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!kidId) return
    let cancelled = false

    supabase
      .from('kids')
      .select('*')
      .eq('id', kidId)
      .single()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) setError(fetchError.message)
        else setKid(data as Kid)
      })

    return () => {
      cancelled = true
    }
  }, [kidId])

  function flashSaved() {
    playSuccess()
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  async function changeAvatar(key: string) {
    if (!kidId) return
    const { error: updateError } = await supabase.from('kids').update({ avatar: key }).eq('id', kidId)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setKid((k) => (k ? { ...k, avatar: key } : k))
    flashSaved()
  }

  async function changeTheme(id: string) {
    if (!kidId) return
    const { error: updateError } = await supabase.from('kids').update({ theme: id }).eq('id', kidId)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setKid((k) => (k ? { ...k, theme: id } : k))
    flashSaved()
  }

  if (!kid) return <LoadingScreen />

  const Icon = kid.avatar ? AVATAR_ICONS[kid.avatar] : undefined
  const theme = getTheme(kid.theme)

  return (
    <div
      className={`animate-fade-in-up flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12 text-center transition-colors duration-500 ${theme.pageBg}`}
    >
      <div
        className={`flex h-24 w-24 animate-pop items-center justify-center rounded-full text-white ${theme.accentBg}`}
      >
        {Icon ? <Icon className="h-12 w-12" /> : kid.name[0]?.toUpperCase()}
      </div>

      <h1 className={`text-2xl font-bold ${theme.heading}`}>
        Today's practice is coming soon, {kid.name}!
      </h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className={`flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl p-5 shadow-sm ${theme.cardBg}`}>
        <h2 className={`text-sm font-semibold ${theme.bodyText}`}>Pick your avatar</h2>
        <AvatarPicker
          value={kid.avatar}
          onChange={(key) => {
            playTap()
            changeAvatar(key)
          }}
        />
      </div>

      <div className={`flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl p-5 shadow-sm ${theme.cardBg}`}>
        <h2 className={`text-sm font-semibold ${theme.bodyText}`}>Pick your theme</h2>
        <ThemePicker
          value={kid.theme}
          onChange={(id) => {
            playTap()
            changeTheme(id)
          }}
        />
      </div>

      {saved && <p className={`animate-pop text-sm font-semibold ${theme.accentText}`}>Saved!</p>}

      <BackButton onClick={() => navigate(-1)} className={theme.bodyText} />
    </div>
  )
}
