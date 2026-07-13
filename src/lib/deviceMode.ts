export type DeviceType = 'kid' | 'parent'

const STORAGE_KEY = 'qma:deviceType'

export function getDeviceType(): DeviceType | null {
  const value = localStorage.getItem(STORAGE_KEY)
  return value === 'kid' || value === 'parent' ? value : null
}

export function setDeviceType(type: DeviceType): void {
  localStorage.setItem(STORAGE_KEY, type)
}

export function clearDeviceType(): void {
  localStorage.removeItem(STORAGE_KEY)
}
