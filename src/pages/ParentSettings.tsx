import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2, UserPlus, X, Unlock, Smartphone, LogOut, ChevronRight } from 'lucide-react'
import { clearPin, hasPin, setPin } from '../lib/pin'
import { useDeviceMode } from '../context/DeviceModeContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { fetchReciters } from '../lib/quran'
import { getDisplayName, hasCustomName } from '../lib/displayName'
import type { Kid } from '../types/database'
import { AVATAR_ICONS } from '../lib/avatarIcons'
import { getTheme } from '../lib/themes'
import { PinPad } from '../components/PinPad'
import { KidForm } from '../components/KidForm'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { BackButton } from '../components/BackButton'
import { playSuccess, playError, playTap } from '../lib/sounds'

export function ParentSettings() {
  const navigate = useNavigate()
  const { clearDeviceType } = useDeviceMode()
  const { user, signOut } = useAuth()
  const [pinSet, setPinSet] = useState(hasPin())
  const [message, setMessage] = useState<string | null>(null)
  const [name, setName] = useState(hasCustomName(user) ? getDisplayName(user) : '')
  const [nameSaving, setNameSaving] = useState(false)

  const [kids, setKids] = useState<Kid[] | null>(null)
  const [kidsError, setKidsError] = useState<string | null>(null)
  const [editingKid, setEditingKid] = useState<Kid | null>(null)
  const [deletingKid, setDeletingKid] = useState<Kid | null>(null)
  const [addingKid, setAddingKid] = useState(false)
  const [reciterNames, setReciterNames] = useState<Record<string, string>>({})

  const loadKids = useCallback(async () => {
    const { data, error: fetchError } = await supabase.from('kids').select('*').order('created_at')
    if (fetchError) setKidsError(fetchError.message)
    else setKids((data ?? []) as Kid[])
  }, [])

  useEffect(() => {
    loadKids()
  }, [loadKids])

  useEffect(() => {
    fetchReciters()
      .then((list) => {
        setReciterNames(Object.fromEntries(list.map((r) => [r.identifier, r.englishName])))
      })
      .catch(() => {
        // Reciter names are a display nicety — fine to just show nothing.
      })
  }, [])

  async function handleSetPin(pin: string) {
    await setPin(pin)
    setPinSet(true)
    setMessage('PIN saved.')
    playSuccess()
  }

  function handleRemovePin() {
    clearPin()
    setPinSet(false)
    setMessage('PIN removed — Parent Mode is now unprotected.')
    playTap()
  }

  async function handleSaveName() {
    if (!name.trim()) return
    setNameSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ data: { full_name: name.trim() } })
    setNameSaving(false)
    if (updateError) {
      playError()
      setMessage(updateError.message)
      return
    }
    playSuccess()
    setMessage('Name saved.')
  }

  function handleChangeDeviceType() {
    playTap()
    clearDeviceType()
    navigate('/device-setup')
  }

  async function confirmDeleteKid() {
    if (!deletingKid) return
    const kid = deletingKid

    const { error: deleteError } = await supabase.from('kids').delete().eq('id', kid.id)
    setDeletingKid(null)

    if (deleteError) {
      setKidsError(deleteError.message)
      return
    }

    if (editingKid?.id === kid.id) setEditingKid(null)
    loadKids()
  }

  return (
    <div className="animate-fade-in-up mx-auto flex min-h-screen max-w-md flex-col gap-8 bg-slate-50 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-bold text-slate-800">Parent Settings</h1>
        <BackButton onClick={() => navigate('/parent')} />
      </div>

      <section className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-700">Your name</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={getDisplayName(user)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          />
          <button
            type="button"
            onClick={handleSaveName}
            disabled={nameSaving || !name.trim()}
            className="rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50"
          >
            {nameSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {message && <p className="text-sm text-emerald-600">{message}</p>}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-700">Manage kids</h2>
          <button
            type="button"
            onClick={() => {
              playTap()
              setEditingKid(null)
              setAddingKid((v) => !v)
            }}
            className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-95"
          >
            {addingKid ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {addingKid ? 'Cancel' : 'Add kid'}
          </button>
        </div>

        {kidsError && <p className="text-sm text-red-600">{kidsError}</p>}

        {kids === null ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : kids.length === 0 && !addingKid ? (
          <p className="text-sm text-slate-500">No kids yet — tap "Add kid" to create one.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {kids.map((kid) => {
              const Icon = kid.avatar ? AVATAR_ICONS[kid.avatar] : undefined
              const theme = getTheme(kid.theme)
              return (
                <li
                  key={kid.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${theme.accentBg}`}
                    >
                      {Icon ? <Icon className="h-5 w-5" /> : kid.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{kid.name}</p>
                      {reciterNames[kid.preferred_reciter] && (
                        <p className="text-xs text-slate-400">{reciterNames[kid.preferred_reciter]}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        playTap()
                        setAddingKid(false)
                        setEditingKid(kid)
                      }}
                      aria-label={`Edit ${kid.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 active:scale-90"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playTap()
                        setDeletingKid(kid)
                      }}
                      aria-label={`Delete ${kid.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50 active:scale-90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {editingKid && (
          <KidForm
            key={editingKid.id}
            kid={editingKid}
            onDone={() => {
              setEditingKid(null)
              loadKids()
            }}
            onCancel={() => setEditingKid(null)}
          />
        )}

        {addingKid && (
          <KidForm
            onDone={() => {
              setAddingKid(false)
              loadKids()
            }}
            onCancel={() => setAddingKid(false)}
          />
        )}
      </section>

      <section className="flex flex-col items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-700">
          {pinSet ? 'Change PIN' : 'Set a Parent PIN'}
        </h2>
        <PinPad onSubmit={handleSetPin} submitLabel="Save" />
        {pinSet && (
          <button
            type="button"
            onClick={handleRemovePin}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 active:scale-95"
          >
            <Unlock className="h-4 w-4" />
            Remove PIN
          </button>
        )}
        {message && <p className="text-sm text-emerald-600">{message}</p>}
      </section>

      <section className="flex flex-col gap-1 rounded-2xl bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={handleChangeDeviceType}
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-100 active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <Smartphone className="h-4 w-4" />
          </span>
          <span className="flex-1 text-sm font-medium text-slate-700">Change device type</span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>

        <div className="mx-3 h-px bg-slate-100" />

        <button
          type="button"
          onClick={() => {
            playTap()
            signOut()
          }}
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-red-50 active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600">
            <LogOut className="h-4 w-4" />
          </span>
          <span className="flex-1 text-sm font-medium text-red-600">Sign out</span>
        </button>
      </section>

      {deletingKid && (
        <ConfirmDialog
          title={`Delete ${deletingKid.name}?`}
          message="This removes all their progress and cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={confirmDeleteKid}
          onCancel={() => setDeletingKid(null)}
        />
      )}
    </div>
  )
}
