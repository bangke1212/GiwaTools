import { formatEther } from 'viem'

export function shortenAddress(address?: string | null) {
  if (!address) return '—'
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function formatEth(value: bigint) {
  const formatted = formatEther(value)
  const [whole, decimal = ''] = formatted.split('.')
  const trimmed = decimal.slice(0, 6).replace(/0+$/, '')
  return trimmed ? `${whole}.${trimmed}` : whole
}

export function formatTime(value?: string | Date | null) {
  if (!value) return 'Belum ada pembacaan'
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value))
}

export function chainLabel(chainId: number | null) {
  if (chainId === 91342) return 'GIWA Sepolia'
  if (chainId === null) return 'Belum terhubung'
  return `Chain ${chainId}`
}
