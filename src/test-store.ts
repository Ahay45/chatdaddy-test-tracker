/**
 * test-store.ts
 * Persists test results to localStorage.
 * Key: chatdaddy-test-tracker
 * Schema: { [moduleId_featureName]: TestStatus }
 */

export type TestStatus = 'untested' | 'pass' | 'fail' | 'skip'

const STORAGE_KEY = 'chatdaddy-test-tracker'

export function loadResults(): Record<string, TestStatus> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveResult(key: string, status: TestStatus): Record<string, TestStatus> {
  const results = loadResults()
  results[key] = status
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results))
  return results
}

export function clearResults(): Record<string, TestStatus> {
  localStorage.removeItem(STORAGE_KEY)
  return {}
}

export function makeKey(moduleId: string, featureName: string): string {
  return `${moduleId}::${featureName}`
}
