import type { ActivityRecord } from '../types/wallet'

const ACTIVITY_KEY = 'giwatools.activity.v1'

export function readActivities(): ActivityRecord[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY)
    return raw ? (JSON.parse(raw) as ActivityRecord[]) : []
  } catch {
    return []
  }
}

export function writeActivities(items: ActivityRecord[]) {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(items.slice(0, 20)))
}
