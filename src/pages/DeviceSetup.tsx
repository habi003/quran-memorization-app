import { useNavigate } from 'react-router-dom'
import { useDeviceMode } from '../context/DeviceModeContext'
import { playTap } from '../lib/sounds'

export function DeviceSetup() {
  const { setDeviceType } = useDeviceMode()
  const navigate = useNavigate()

  function choose(type: 'kid' | 'parent') {
    playTap()
    setDeviceType(type)
    navigate(type === 'kid' ? '/kids' : '/parent', { replace: true })
  }

  return (
    <div className="animate-fade-in-up flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-50 px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">What kind of device is this?</h1>
        <p className="mt-2 text-slate-500">This decides what this device opens to by default.</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          onClick={() => choose('kid')}
          className="rounded-2xl bg-emerald-600 px-8 py-6 text-lg font-semibold text-white shadow-md transition active:scale-95"
        >
          This is a Kid tablet
        </button>
        <button
          type="button"
          onClick={() => choose('parent')}
          className="rounded-2xl bg-slate-800 px-8 py-6 text-lg font-semibold text-white shadow-md transition active:scale-95"
        >
          This is my Parent device
        </button>
      </div>
    </div>
  )
}
