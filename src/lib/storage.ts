import type { ActivityRecord } from '../types/wallet'
import type { AppNetworkId } from './networks'

const ACTIVITY_KEY = 'giwatools.activity.v1'
const TRACKED_TOKEN_KEY = 'giwatools.tracked-token.v1'

export type TrackedToken = {
  address: `0x${string}`
  networkId: AppNetworkId
  name: string
  symbol: string
  decimals: number
}

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

export function updateActivity(id: string, patch: Partial<Omit<ActivityRecord, 'id' | 'createdAt'>>) {
  const next = readActivities().map((activity) => activity.id === id ? { ...activity, ...patch } : activity)
  writeActivities(next)
  return next
}

export function readTrackedToken(): TrackedToken | null {
  try {
    const raw = localStorage.getItem(TRACKED_TOKEN_KEY)
    return raw ? (JSON.parse(raw) as TrackedToken) : null
  } catch {
    return null
  }
}

export function writeTrackedToken(token: TrackedToken) {
  localStorage.setItem(TRACKED_TOKEN_KEY, JSON.stringify(token))
}
