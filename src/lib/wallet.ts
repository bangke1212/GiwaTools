import { createEVMClient } from '@metamask/connect-evm'
import EthereumProvider from '@walletconnect/ethereum-provider'
import { createWalletClient, custom, type WalletClient } from 'viem'
import { GIWA_CHAIN_ID, giwaSepolia } from './giwa'

type RequestArgs = {
  method: string
  params?: unknown[]
}

export type InjectedProvider = {
  request: (args: RequestArgs) => Promise<unknown>
  isMetaMask?: boolean
  providers?: InjectedProvider[]
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

export type WalletSource = 'injected' | 'metamask' | 'walletconnect'

type WalletConnection = {
  address: `0x${string}`
  chainId: number
  source: WalletSource
}

declare global {
  interface Window {
    ethereum?: InjectedProvider
  }
}

let walletConnectProvider: Awaited<ReturnType<typeof EthereumProvider.init>> | null = null
let metaMaskMobileClient: Awaited<ReturnType<typeof createEVMClient>> | null = null

export const getInjectedProvider = () => (typeof window === 'undefined' ? undefined : window.ethereum)
export const hasInjectedWallet = () => typeof window !== 'undefined' && Boolean(window.ethereum)
export const getMetaMaskProvider = () => {
  const provider = getInjectedProvider()
  return provider?.providers?.find((candidate) => candidate.isMetaMask) || (provider?.isMetaMask ? provider : undefined)
}
export const hasMetaMaskWallet = () => Boolean(getMetaMaskProvider())
export const getWalletConnectProjectId = () => (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '').trim()
export const hasWalletConnectConfig = () => getWalletConnectProjectId().length > 0

export async function connectInjectedWallet(): Promise<WalletConnection> {
  const provider = getInjectedProvider()
  if (!provider) throw new Error('Browser wallet belum tersedia. Buka dApp di Klever Wallet atau browser yang memiliki wallet EVM.')

  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
  const chainHex = (await provider.request({ method: 'eth_chainId' })) as string
  const address = accounts[0]
  if (!address) throw new Error('Wallet tidak mengembalikan address.')

  return { address: address as `0x${string}`, chainId: Number.parseInt(chainHex, 16), source: 'injected' }
}

export async function connectMetaMaskWallet(): Promise<WalletConnection> {
  const provider = getMetaMaskProvider()
  if (!provider) throw new Error('MetaMask belum terdeteksi. Pasang extension MetaMask atau buka dApp dari browser MetaMask.')

  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
  const chainHex = (await provider.request({ method: 'eth_chainId' })) as string
  const address = accounts[0]
  if (!address) throw new Error('MetaMask tidak mengembalikan address.')

  return { address: address as `0x${string}`, chainId: Number.parseInt(chainHex, 16), source: 'injected' }
}


export async function connectMetaMaskMobileWallet(): Promise<WalletConnection> {
  const chainHex = `0x${GIWA_CHAIN_ID.toString(16)}` as `0x${string}`
  metaMaskMobileClient ??= await createEVMClient({
    dapp: {
      name: 'GiwaTools',
      url: window.location.origin,
      iconUrl: `${window.location.origin}/favicon.svg`,
    },
    api: {
      supportedNetworks: { [chainHex]: giwaSepolia.rpcUrls.default.http[0] },
    },
    mobile: { useDeeplink: true },
    ui: { preferExtension: true, showInstallModal: false },
    analytics: { enabled: false },
  })

  const connected = await metaMaskMobileClient.connect({ chainIds: [chainHex] })
  const address = connected.accounts[0]
  if (!address) throw new Error('MetaMask Mobile tidak mengembalikan address.')

  return { address: address as `0x${string}`, chainId: Number.parseInt(connected.chainId, 16), source: 'metamask' }
}
export async function connectKleverWallet(): Promise<WalletConnection> {
  const projectId = getWalletConnectProjectId()
  if (!projectId) throw new Error('WalletConnect belum dikonfigurasi. Tambahkan VITE_WALLETCONNECT_PROJECT_ID dari WalletConnect Cloud.')

  if (!walletConnectProvider) {
    walletConnectProvider = await EthereumProvider.init({
      projectId,
      chains: [GIWA_CHAIN_ID],
      optionalChains: [GIWA_CHAIN_ID],
      showQrModal: true,
      metadata: {
        name: 'GiwaTools',
        description: 'Non-custodial GIWA Sepolia wallet cockpit',
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.svg`],
      },
    })
  }

  if (!walletConnectProvider.session) await walletConnectProvider.connect()
  const address = walletConnectProvider.accounts?.[0]
  if (!address) throw new Error('Klever Wallet belum menyetujui koneksi WalletConnect.')

  return { address: address as `0x${string}`, chainId: walletConnectProvider.chainId, source: 'walletconnect' }
}

export async function getConnectedWallet(): Promise<WalletConnection | null> {
  if (metaMaskMobileClient) {
    const accounts = (await metaMaskMobileClient.getProvider().request({ method: 'eth_accounts' })) as string[]
    if (accounts[0]) {
      const chainHex = (await metaMaskMobileClient.getProvider().request({ method: 'eth_chainId' })) as string
      return { address: accounts[0] as `0x${string}`, chainId: Number.parseInt(chainHex, 16), source: 'metamask' }
    }
  }

  if (walletConnectProvider?.session && walletConnectProvider.accounts?.[0]) {
    return {
      address: walletConnectProvider.accounts[0] as `0x${string}`,
      chainId: walletConnectProvider.chainId,
      source: 'walletconnect',
    }
  }

  const provider = getInjectedProvider()
  if (!provider) return null
  const accounts = (await provider.request({ method: 'eth_accounts' })) as string[]
  if (!accounts[0]) return null
  const chainHex = (await provider.request({ method: 'eth_chainId' })) as string
  return { address: accounts[0] as `0x${string}`, chainId: Number.parseInt(chainHex, 16), source: 'injected' }
}

export async function switchToGiwaSepolia(source: WalletSource = 'injected') {
  const provider = source === 'walletconnect' ? walletConnectProvider : source === 'metamask' ? metaMaskMobileClient?.getProvider() : getInjectedProvider()
  if (!provider) throw new Error('Provider wallet belum tersedia.')

  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${GIWA_CHAIN_ID.toString(16)}` }] })
  } catch (error) {
    const code = (error as { code?: number }).code
    if (source !== 'injected' || code !== 4902) throw error
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

export async function disconnectWallet(source: WalletSource) {
  if (source === 'walletconnect' && walletConnectProvider?.session) {
    await walletConnectProvider.disconnect()
    walletConnectProvider = null
  }
}

export function getWalletClient(address: `0x${string}`, source: WalletSource = 'injected'): WalletClient | null {
  const provider = source === 'walletconnect' ? walletConnectProvider : source === 'metamask' ? metaMaskMobileClient?.getProvider() : getInjectedProvider()
  if (!provider) return null
  return createWalletClient({ account: address, chain: giwaSepolia, transport: custom(provider) })
}
