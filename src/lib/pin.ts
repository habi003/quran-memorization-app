const STORAGE_KEY = 'qma:parentPinHash'
// Fixed salt — this hash only stops a PIN from being read in plain text out of
// devtools' localStorage inspector. Per spec §5 the PIN is "not a real auth
// boundary, just a speed bump," so no per-device random salt is needed.
const SALT = 'qma-parent-pin-v1'

async function hashPin(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(SALT + pin)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function hasPin(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null
}

export async function setPin(pin: string): Promise<void> {
  localStorage.setItem(STORAGE_KEY, await hashPin(pin))
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return false
  return (await hashPin(pin)) === stored
}

export function clearPin(): void {
  localStorage.removeItem(STORAGE_KEY)
}
