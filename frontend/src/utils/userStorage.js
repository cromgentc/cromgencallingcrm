function getCurrentUserKey() {
  try {
    const user = JSON.parse(localStorage.getItem('calltrack_user') || '{}')
    return user?.id || user?._id || user?.staffId || user?.email || 'anonymous'
  } catch {
    return 'anonymous'
  }
}

export function userStorageKey(baseKey) {
  return `${baseKey}:${getCurrentUserKey()}`
}

export function readUserJson(baseKey, fallback) {
  try {
    return JSON.parse(localStorage.getItem(userStorageKey(baseKey)) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

export function writeUserJson(baseKey, value) {
  localStorage.setItem(userStorageKey(baseKey), JSON.stringify(value))
}
