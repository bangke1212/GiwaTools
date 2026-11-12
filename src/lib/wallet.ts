import { createWalletClient, custom, type WalletClient } from 'viem'
import { GIWA_CHAIN_ID, giwaSepolia } from './giwa'

type RequestArgs = {
  method: string
  params?: unknown[]
}

export type InjectedProvider = {
  request: (args: RequestArgs) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: InjectedProvider
  }
}

export const getInjectedProvider = () => window.ethereum

export const hasInjectedWallet = () => typeof window !== 'undefined' && Boolean(window.ethereum)

export async function connectInjectedWallet() {
  const provider = getInjectedProvider()
  if (!provider) throw new Error('Browser wallet belum tersedia. Buka aplikasi melalui browser yang memiliki wallet EVM.')

  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
  const chainHex = (await provider.request({ method: 'eth_chainId' })) as string
  const address = accounts[0]
  if (!address) throw new Error('Wallet tidak mengembalikan address.')

  return {
    address: address as `0x${string}`,
    chainId: Number.parseInt(chainHex, 16),
  }
}

export async function getConnectedWallet() {
  const provider = getInjectedProvider()
  if (!provider) return null
  const accounts = (await provider.request({ method: 'eth_accounts' })) as string[]
  if (!accounts[0]) return null
  const chainHex = (await provider.request({ method: 'eth_chainId' })) as string
  return {
    address: accounts[0] as `0x${string}`,
    chainId: Number.parseInt(chainHex, 16),
  }
}

export async function switchToGiwaSepolia() {
  const provider = getInjectedProvider()
  if (!provider) throw new Error('Browser wallet belum tersedia.')

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${GIWA_CHAIN_ID.toString(16)}` }],
    })
  } catch (error) {
    const code = (error as { code?: number }).code
    if (code !== 4902) throw error
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: `0x${GIWA_CHAIN_ID.toString(16)}`,
        chainName: giwaSepolia.name,
        nativeCurrency: giwaSepolia.nativeCurrency,
        rpcUrls: [giwaSepolia.rpcUrls.default.http[0]],
        blockExplorerUrls: [giwaSepolia.blockExplorers.default.url],
      }],
    })
  }
}

export function getWalletClient(address: `0x${string}`): WalletClient | null {
  const provider = getInjectedProvider()
  if (!provider) return null
  return createWalletClient({
    account: address,
    chain: giwaSepolia,
    transport: custom(provider),
  })
}
