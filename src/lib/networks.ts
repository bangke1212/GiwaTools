import { createPublicClient, defineChain, http, type PublicClient } from 'viem'

export type AppNetworkId = 'ethereum-sepolia' | 'bsc-testnet' | 'giwa-testnet'

export type AppNetwork = {
  id: AppNetworkId
  name: string
  shortName: string
  chainId: number
  rpcUrl: string
  symbol: string
  explorerUrl: string
  testnet: true
}

export const APP_NETWORKS: Record<AppNetworkId, AppNetwork> = {
  'ethereum-sepolia': {
    id: 'ethereum-sepolia', name: 'Ethereum Sepolia', shortName: 'ETH SEP', chainId: 11155111,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com', symbol: 'ETH', explorerUrl: 'https://sepolia.etherscan.io', testnet: true,
  },
  'bsc-testnet': {
    id: 'bsc-testnet', name: 'BNB Smart Chain Testnet', shortName: 'BSC TEST', chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545', symbol: 'tBNB', explorerUrl: 'https://testnet.bscscan.com', testnet: true,
  },
  'giwa-testnet': {
    id: 'giwa-testnet', name: 'GIWA Testnet', shortName: 'GIWA TEST', chainId: 91342,
    rpcUrl: import.meta.env.VITE_GIWA_RPC_URL || 'https://sepolia-rpc.giwa.io', symbol: 'ETH', explorerUrl: 'https://sepolia-explorer.giwa.io', testnet: true,
  },
}

export const appNetworkChains = Object.fromEntries(Object.values(APP_NETWORKS).map((network) => [network.id, defineChain({
  id: network.chainId,
  name: network.name,
  nativeCurrency: { name: network.symbol === 'tBNB' ? 'Test BNB' : network.symbol, symbol: network.symbol, decimals: 18 },
  rpcUrls: { default: { http: [network.rpcUrl] } },
  blockExplorers: { default: { name: network.name + ' Explorer', url: network.explorerUrl } },
  testnet: true,
})])) as Record<AppNetworkId, ReturnType<typeof defineChain>>

const publicClients = Object.fromEntries(Object.values(APP_NETWORKS).map((network) => [network.id, createPublicClient({
  chain: appNetworkChains[network.id], transport: http(network.rpcUrl),
})])) as Record<AppNetworkId, PublicClient>

export const getNetwork = (id: AppNetworkId) => APP_NETWORKS[id]
export const getPublicClient = (id: AppNetworkId) => publicClients[id]
export const explorerAddressUrlFor = (id: AppNetworkId, address: string) => `${APP_NETWORKS[id].explorerUrl}/address/${address}`
export const explorerTxUrlFor = (id: AppNetworkId, hash: string) => `${APP_NETWORKS[id].explorerUrl}/tx/${hash}`
