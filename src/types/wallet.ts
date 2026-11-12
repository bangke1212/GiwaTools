export type WalletState = {
  address: `0x${string}` | null
  chainId: number | null
  connected: boolean
  error: string | null
}

export type BalanceState = {
  eth: string
  blockNumber: bigint | null
  updatedAt: Date | null
  loading: boolean
  error: string | null
}

export type ActivityStatus = 'info' | 'pending' | 'success' | 'error'

export type ActivityRecord = {
  id: string
  kind: 'wallet' | 'token' | 'transaction' | 'backup'
  title: string
  detail: string
  status: ActivityStatus
  createdAt: string
  txHash?: `0x${string}`
}
