import { createPublicClient, defineChain, http, type PublicClient } from 'viem'

export const GIWA_CHAIN_ID = 91342
export const GIWA_RPC_URL = import.meta.env.VITE_GIWA_RPC_URL || 'https://sepolia-rpc.giwa.io'
export const GIWA_EXPLORER_URL = 'https://sepolia-explorer.giwa.io'

export const giwaSepolia = defineChain({
  id: GIWA_CHAIN_ID,
  name: 'GIWA Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [GIWA_RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'GIWA Explorer', url: GIWA_EXPLORER_URL },
  },
  testnet: true,
})

export const publicClient: PublicClient = createPublicClient({
  chain: giwaSepolia,
  transport: http(GIWA_RPC_URL),
})

export const explorerAddressUrl = (address: string) => `${GIWA_EXPLORER_URL}/address/${address}`
export const explorerTxUrl = (hash: string) => `${GIWA_EXPLORER_URL}/tx/${hash}`
