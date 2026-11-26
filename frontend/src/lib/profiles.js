// Two people, one install. Jole and Krys share the app but never a storage
// namespace: every localStorage key the app uses is transparently prefixed with
// the active profile, and the phone's files get a profile suffix too.
//
// The profile is chosen on the picker and kept in sessionStorage, so a cold
// start asks again and a reload during the same session keeps the choice.
// Switching profiles reloads the app: that re-runs the store with the new
// prefix, which is far safer than hot-swapping a syncing, media-owning store.

const PROFILE_KEY = 'gym_active_profile'
const PREFIX_BASE = 'gym_profile'
const GLOBAL_KEYS = new Set([PROFILE_KEY, 'gym_profiles_v1'])

export const PROFILES = [
  { id: 'jole', name: 'Jole' },
  { id: 'krys', name: 'Krys' },
]

const TEST = (() => {
  try { return import.meta.env?.MODE === 'test' } catch { return false }
})()

export const isProfile = id => PROFILES.some(p => p.id === id)
export const profileName = id => PROFILES.find(p => p.id === id)?.name || ''

export function getActiveProfile() {
  try {
    const v = sessionStorage.getItem(PROFILE_KEY)
    return isProfile(v) ? v : null
  } catch { return null }
}

export function setActiveProfile(id) {
  if (!isProfile(id)) throw new Error('unknown profile: ' + id)
  sessionStorage.setItem(PROFILE_KEY, id)
}

export function clearActiveProfile() {
  try { sessionStorage.removeItem(PROFILE_KEY) } catch { /* storage blocked */ }
}

// The other profile, or null when there is only one. The switch is set + reload:
// the storage prefix and the native file names are worked out when the module is
// first imported, so a reload is what makes the new profile's store.
export function otherProfile() {
  const cur = getActiveProfile()
  return PROFILES.find(p => p.id !== cur)?.id || null
}

export function switchProfile(id) {
  if (!isProfile(id)) throw new Error('unknown profile: ' + id)
  if (id === getActiveProfile()) return false
  setActiveProfile(id)
  window.location.reload()
  return true
}

// '' in tests keeps the old file names, so the existing suites do not change.
export function slotSuffix() {
  const id = getActiveProfile()
  if (id) return id
  return TEST ? '' : 'none'
}

export function slotName(base) {
  const s = slotSuffix()
  return s ? `${base}-${s}` : base
}

export function slotFile(base, ext) {
  return `${slotName(base)}.${ext}`
}

export function profilePrefix() {
  return `${PREFIX_BASE}:${getActiveProfile() || 'none'}:`
}

let installed = false

// Prefix every localStorage key with the active profile. sessionStorage is left
// alone (it holds the choice itself), and a few global keys are exempt.
export function installProfileStorage() {
  if (installed || TEST) return
  if (typeof window === 'undefined' || !window.localStorage) return
  const proto = Storage.prototype
  const oGet = proto.getItem
  const oSet = proto.setItem
  const oRemove = proto.removeItem
  const oClear = proto.clear
  const oKey = proto.key
  const prefix = profilePrefix()
  const isLocal = storage => storage === window.localStorage
  const map = (storage, key) => {
    const k = String(key)
    return isLocal(storage) && !GLOBAL_KEYS.has(k) ? prefix + k : k
  }

  proto.getItem = function (key) { return oGet.call(this, map(this, key)) }
  proto.setItem = function (key, value) { return oSet.call(this, map(this, key), value) }
  proto.removeItem = function (key) { return oRemove.call(this, map(this, key)) }
  // Clearing one profile must not wipe the other one's copy.
  proto.clear = function () {
    if (!isLocal(this)) return oClear.call(this)
    const keys = []
    for (let i = 0; i < this.length; i++) {
      const k = oKey.call(this, i)
      if (k && k.startsWith(prefix)) keys.push(k)
    }
    for (const k of keys) oRemove.call(this, k)
  }
  installed = true

  // Native storage events carry the prefixed key; the store listens for the
  // plain names (gym_owner, gym_sync, gym_state_wid). Re-dispatch them plain.
  window.addEventListener('storage', e => {
    if (!e.key || !e.key.startsWith(prefix) || e.storageArea !== window.localStorage) return
    try {
      window.dispatchEvent(new StorageEvent('storage', {
        key: e.key.slice(prefix.length),
        oldValue: e.oldValue,
        newValue: e.newValue,
        url: e.url,
        storageArea: e.storageArea,
      }))
    } catch { /* an old WebView without a constructible StorageEvent */ }
  }, true)
}

installProfileStorage()
