export type WalletState = {
  address: `0x${string}` | null
  chainId: number | null
  connected: boolean
  source: 'injected' | 'metamask' | 'walletconnect' | null
  error: string | null
}

export type BalanceState = {
  eth: string
  blockNumber: bigint | null
  updatedAt: Date | null
  loading: boolean
  error: string | null
}

export type ActivityStatus = 'info' | 'pending' | 'submitted' | 'confirmed' | 'success' | 'error' | 'failed' | 'cancelled'

export type ActivityRecord = {
  id: string
  kind: 'wallet' | 'token' | 'transaction' | 'backup'
  title: string
  detail: string
  status: ActivityStatus
  createdAt: string
  txHash?: `0x${string}`
}
