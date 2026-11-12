import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUpRight, Check, ChevronRight, Clipboard, Coins, Copy, Download, ExternalLink, KeyRound, Link2, LockKeyhole, RefreshCw, ShieldCheck, Sparkles, Wallet, Wifi, XCircle, Zap } from 'lucide-react'
import { formatEther, formatUnits, parseAbiItem, parseUnits } from 'viem'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GIWA_EXPLORER_URL, explorerAddressUrl } from '../lib/giwa'
import { createEncryptedWalletBackup, downloadEncryptedWallet } from '../lib/keystore'
import { formatEth, formatTime, shortenAddress, chainLabel } from '../lib/format'
import { readActivities, readTrackedToken, writeActivities, writeTrackedToken, type TrackedToken } from '../lib/storage'
import { generateTokenIdentity } from '../lib/token-names'
import { connectInjectedWallet, connectMetaMaskMobileWallet, connectMetaMaskWallet, getConnectedWallet, getInjectedProvider, hasInjectedWallet, getWalletClientForNetwork, switchToNetwork } from '../lib/wallet'
import type { ActivityRecord, BalanceState, WalletState } from '../types/wallet'
import { APP_NETWORKS, appNetworkChains, explorerTxUrlFor, getNetwork, getPublicClient, type AppNetworkId } from '../lib/networks'
import { TOKEN_CONTRACT_ABI, TOKEN_CONTRACT_BYTECODE } from '../lib/token-contract'

const initialWallet: WalletState = { address: null, chainId: null, connected: false, source: null, error: null }
const initialBalance: BalanceState = { eth: '0', blockNumber: null, updatedAt: null, loading: false, error: null }
const initialTokenBalance = { amount: '0', updatedAt: null as Date | null, loading: false, error: null as string | null }
const TOKEN_TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')

type TokenTransferRecord = {
  hash: `0x${string}`
  from: `0x${string}`
  to: `0x${string}`
  value: string
  blockNumber: bigint
}

function createActivity(input: Omit<ActivityRecord, 'id' | 'createdAt'>): ActivityRecord {
  return { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
}

function buildTransactionTrend(activities: ActivityRecord[], now: Date) {
  const bucketSize = 5_000
  const points = 12
  const currentBucket = Math.floor(now.getTime() / bucketSize) * bucketSize

  return Array.from({ length: points }, (_, index) => {
    const bucketStart = currentBucket - (points - index - 1) * bucketSize
    const bucketEnd = bucketStart + bucketSize
    const transactions = activities.filter((activity) => {
      if (activity.kind !== 'transaction') return false
      const createdAt = new Date(activity.createdAt).getTime()
      return createdAt >= bucketStart && createdAt < bucketEnd
    }).length

    return {
      label: new Date(bucketStart).toLocaleTimeString('id-ID', { minute: '2-digit', second: '2-digit' }),
      transactions,
    }
  })
}

function App() {
  const [wallet, setWallet] = useState<WalletState>(initialWallet)
  const [balance, setBalance] = useState<BalanceState>(initialBalance)
  const [trackedToken, setTrackedToken] = useState<TrackedToken | null>(() => readTrackedToken())
  const [tokenBalance, setTokenBalance] = useState(initialTokenBalance)
  const [tokenTransfers, setTokenTransfers] = useState<TokenTransferRecord[]>([])
  const [tokenTransfersLoading, setTokenTransfersLoading] = useState(false)
  const [tokenTransfersError, setTokenTransfersError] = useState<string | null>(null)
  const [token, setToken] = useState(generateTokenIdentity)
  const [activities, setActivities] = useState<ActivityRecord[]>(() => readActivities())
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [backupPassword, setBackupPassword] = useState('')
  const [backupPasswordAgain, setBackupPasswordAgain] = useState('')
  const [backupBusy, setBackupBusy] = useState(false)
  const [activeView, setActiveView] = useState<'dashboard' | 'networks' | 'deploy'>('dashboard')
  const [selectedNetworkId, setSelectedNetworkId] = useState<AppNetworkId>('giwa-testnet')
  const [deployName, setDeployName] = useState('Giwa Test Token')
  const [deploySymbol, setDeploySymbol] = useState('GTT')
  const [deploySupply, setDeploySupply] = useState('1000000')
  const [deployBusy, setDeployBusy] = useState(false)
  const [trendNow, setTrendNow] = useState(() => new Date())

  const addActivity = useCallback((activity: Omit<ActivityRecord, 'id' | 'createdAt'>) => {
    setActivities((current) => {
      const next = [createActivity(activity), ...current].slice(0, 20)
      writeActivities(next)
      return next
    })
  }, [])

  const refreshWallet = useCallback(async () => {
    try {
      const connected = await getConnectedWallet()
      if (!connected) {
        setWallet(initialWallet)
        setBalance(initialBalance)
        return
      }
      setWallet({ ...connected, connected: true, error: null })
      const networkMatch = Object.values(APP_NETWORKS).find((network) => network.chainId === connected.chainId)
      if (networkMatch) setSelectedNetworkId(networkMatch.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tidak dapat membaca koneksi wallet.'
      setWallet((current) => ({ ...current, error: message }))
    }
  }, [])

  const refreshBalance = useCallback(async (address = wallet.address) => {
    if (!address) return
    setBalance((current) => ({ ...current, loading: true, error: null }))
    try {
      const [rawBalance, blockNumber] = await Promise.all([
        getPublicClient(selectedNetworkId).getBalance({ address }),
        getPublicClient(selectedNetworkId).getBlockNumber(),
      ])
      setBalance({ eth: formatEther(rawBalance), blockNumber, updatedAt: new Date(), loading: false, error: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'RPC GIWA belum merespons.'
      setBalance((current) => ({ ...current, loading: false, error: message }))
    }
  }, [wallet.address, selectedNetworkId])

  const refreshTokenBalance = useCallback(async (address = wallet.address) => {
    if (!address || !trackedToken) return
    if (trackedToken.networkId !== selectedNetworkId) {
      setTokenBalance((current) => ({ ...current, loading: false, error: `Token berada di ${getNetwork(trackedToken.networkId).shortName}.` }))
      return
    }
    setTokenBalance((current) => ({ ...current, loading: true, error: null }))
    try {
      const rawBalance = await getPublicClient(selectedNetworkId).readContract({
        address: trackedToken.address,
        abi: TOKEN_CONTRACT_ABI,
        functionName: 'balanceOf',
        args: [address],
      }) as bigint
      setTokenBalance({ amount: formatUnits(rawBalance, trackedToken.decimals), updatedAt: new Date(), loading: false, error: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Saldo token belum dapat dibaca dari RPC.'
      setTokenBalance((current) => ({ ...current, loading: false, error: message }))
    }
  }, [wallet.address, selectedNetworkId, trackedToken])

  const refreshTokenHistory = useCallback(async () => {
    if (!trackedToken) {
      setTokenTransfers([])
      return
    }
    if (trackedToken.networkId !== selectedNetworkId) {
      setTokenTransfers([])
      setTokenTransfersError(`Token berada di ${getNetwork(trackedToken.networkId).shortName}.`)
      return
    }
    setTokenTransfersLoading(true)
    setTokenTransfersError(null)
    try {
      const client = getPublicClient(selectedNetworkId)
      const latestBlock = await client.getBlockNumber()
      const fromBlock = latestBlock > 10_000n ? latestBlock - 10_000n : 0n
      const logs = await client.getLogs({ address: trackedToken.address, event: TOKEN_TRANSFER_EVENT, fromBlock, toBlock: latestBlock })
      const transfers = logs.slice(-20).reverse().map((log) => {
        const args = log.args as { from: `0x${string}`; to: `0x${string}`; value: bigint }
        return {
          hash: log.transactionHash as `0x${string}`,
          from: args.from,
          to: args.to,
          value: formatUnits(args.value, trackedToken.decimals),
          blockNumber: log.blockNumber,
        }
      })
      setTokenTransfers(transfers)
    } catch (error) {
      setTokenTransfersError(error instanceof Error ? error.message : 'Riwayat transfer belum dapat dibaca dari RPC.')
    } finally {
      setTokenTransfersLoading(false)
    }
  }, [selectedNetworkId, trackedToken])

  useEffect(() => {
    void refreshWallet()
    const provider = getInjectedProvider()
    const onAccountsChanged = () => void refreshWallet()
    const onChainChanged = () => void refreshWallet()
    provider?.on?.('accountsChanged', onAccountsChanged)
    provider?.on?.('chainChanged', onChainChanged)
    const timer = window.setInterval(() => void refreshWallet(), 5000)
    return () => {
      provider?.removeListener?.('accountsChanged', onAccountsChanged)
      provider?.removeListener?.('chainChanged', onChainChanged)
      window.clearInterval(timer)
    }
  }, [refreshWallet])

  useEffect(() => {
    if (!wallet.address) return
    void refreshBalance(wallet.address)
    const timer = window.setInterval(() => void refreshBalance(wallet.address), 5000)
    return () => window.clearInterval(timer)
  }, [wallet.address, wallet.chainId, refreshBalance])

  useEffect(() => {
    if (!wallet.address || !trackedToken) return
    void refreshTokenBalance(wallet.address)
    const timer = window.setInterval(() => void refreshTokenBalance(wallet.address), 5000)
    return () => window.clearInterval(timer)
  }, [wallet.address, wallet.chainId, trackedToken, refreshTokenBalance])

  useEffect(() => {
    void refreshTokenHistory()
    const timer = window.setInterval(() => void refreshTokenHistory(), 5000)
    return () => window.clearInterval(timer)
  }, [trackedToken, selectedNetworkId, refreshTokenHistory])

  useEffect(() => {
    const timer = window.setInterval(() => setTrendNow(new Date()), 5000)
    return () => window.clearInterval(timer)
  }, [])

  const selectedNetwork = getNetwork(selectedNetworkId)
  const transactionTrend = useMemo(() => buildTransactionTrend(activities, trendNow), [activities, trendNow])
  const transactionTotal = useMemo(() => activities.filter((activity) => activity.kind === 'transaction').length, [activities])
  const isSelectedChain = wallet.chainId === selectedNetwork.chainId
  const statusLabel = wallet.connected ? (isSelectedChain ? `LIVE / ${selectedNetwork.shortName}` : 'NETWORK REVIEW') : 'WALLET OFFLINE'
  const statusTone = wallet.connected && isSelectedChain ? 'live' : wallet.connected ? 'warn' : 'idle'
  async function handleSelectNetwork(networkId: AppNetworkId) {
    const network = getNetwork(networkId)
    setSelectedNetworkId(networkId)
    if (!wallet.connected) { setNotice({ type: 'info', message: `${network.name} dipilih. Hubungkan wallet untuk membaca balance.` }); return }
    try {
      await switchToNetwork(network, wallet.source || 'injected')
      await refreshWallet()
      setNotice({ type: 'success', message: `${network.name} aktif di wallet.` })
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Network tidak dapat diganti.' })
    }
  }

  async function handleDeployToken() {
    if (!wallet.address) { setNotice({ type: 'error', message: 'Hubungkan wallet sebelum deploy token.' }); return }
    if (!deployName.trim() || !deploySymbol.trim() || !deploySupply || Number(deploySupply) <= 0) { setNotice({ type: 'error', message: 'Isi nama, simbol, dan supply token dengan benar.' }); return }
    setDeployBusy(true)
    try {
      await switchToNetwork(selectedNetwork, wallet.source || 'injected')
      const walletClient = getWalletClientForNetwork(wallet.address, appNetworkChains[selectedNetworkId], wallet.source || 'injected')
      if (!walletClient) throw new Error('Wallet client tidak tersedia.')
      const initialSupply = parseUnits(deploySupply, 18)
      const hash = await walletClient.deployContract({ account: wallet.address, chain: appNetworkChains[selectedNetworkId], abi: TOKEN_CONTRACT_ABI, bytecode: TOKEN_CONTRACT_BYTECODE, args: [deployName.trim(), deploySymbol.trim().toUpperCase(), initialSupply, wallet.address] })
      addActivity({ kind: 'transaction', title: 'Token deployment submitted', detail: `${deployName.trim()} / ${selectedNetwork.name}`, status: 'pending', txHash: hash })
      setNotice({ type: 'success', message: `Transaksi deploy dikirim: ${hash.slice(0, 12)}…` })
      setActiveView('dashboard')
      const deploymentNetworkId = selectedNetworkId
      void getPublicClient(deploymentNetworkId).waitForTransactionReceipt({ hash }).then((receipt) => {
        if (!receipt.contractAddress) return
        const nextToken: TrackedToken = {
          address: receipt.contractAddress,
          networkId: deploymentNetworkId,
          name: deployName.trim(),
          symbol: deploySymbol.trim().toUpperCase(),
          decimals: 18,
        }
        writeTrackedToken(nextToken)
        setTrackedToken(nextToken)
        setNotice({ type: 'success', message: `${nextToken.symbol} aktif. Saldo token akan diperbarui otomatis.` })
      }).catch(() => {
        setNotice({ type: 'info', message: 'Deploy terkirim, tetapi receipt belum dapat dibaca. Saldo token akan tersedia setelah deployment dikonfirmasi.' })
      })
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Deploy token gagal atau ditolak wallet.' })
    } finally { setDeployBusy(false) }
  }

  const formattedBalance = useMemo(() => {
    try {
      return Number(balance.eth).toLocaleString('id-ID', { maximumFractionDigits: 6 })
    } catch {
      return '0'
    }
  }, [balance.eth])

  async function handleConnect() {
    if (!hasInjectedWallet()) {
      setNotice({ type: 'info', message: 'Buka URL GiwaTools di MetaMask atau Klever Web3 browser agar provider wallet diinjeksi.' })
      return
    }
    try {
      const connected = await connectInjectedWallet()
      setWallet({ ...connected, connected: true, error: null })
      addActivity({ kind: 'wallet', title: 'Wallet connected', detail: shortenAddress(connected.address), status: 'success' })
      setNotice({ type: 'success', message: `Wallet ${shortenAddress(connected.address)} terhubung.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wallet gagal terhubung.'
      setWallet((current) => ({ ...current, error: message }))
      setNotice({ type: 'error', message })
    }
  }

  async function handleConnectMetaMaskMobile() {
    try {
      const connected = await connectMetaMaskMobileWallet()
      setWallet({ ...connected, connected: true, error: null })
      addActivity({ kind: 'wallet', title: 'MetaMask Mobile connected', detail: shortenAddress(connected.address), status: 'success' })
      setNotice({ type: 'success', message: `MetaMask Mobile ${shortenAddress(connected.address)} terhubung.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MetaMask Mobile gagal terhubung.'
      setWallet((current) => ({ ...current, error: message }))
      setNotice({ type: 'error', message })
    }
  }

  async function handleConnectMetaMask() {
    try {
      const connected = await connectMetaMaskWallet()
      setWallet({ ...connected, connected: true, error: null })
      addActivity({ kind: 'wallet', title: 'MetaMask connected', detail: shortenAddress(connected.address), status: 'success' })
      setNotice({ type: 'success', message: `MetaMask ${shortenAddress(connected.address)} terhubung.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MetaMask gagal terhubung.'
      setWallet((current) => ({ ...current, error: message }))
      setNotice({ type: 'error', message })
    }
  }

  async function handleSwitchNetwork() {
    try {
      await switchToNetwork(getNetwork('giwa-testnet'), wallet.source || 'injected')
      await refreshWallet()
      setNotice({ type: 'success', message: 'GIWA Sepolia dipilih di wallet.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network tidak dapat diganti.'
      setNotice({ type: 'error', message })
    }
  }

  async function copyText(text: string, message: string) {
    await navigator.clipboard.writeText(text)
    setNotice({ type: 'success', message })
  }

  function regenerateToken() {
    const next = generateTokenIdentity()
    setToken(next)
    addActivity({ kind: 'token', title: 'Token identity generated', detail: `${next.name} / ${next.symbol}`, status: 'info' })
  }

  async function handleBackup() {
    if (backupPassword.length < 12) {
      setNotice({ type: 'error', message: 'Password backup minimal 12 karakter.' })
      return
    }
    if (backupPassword !== backupPasswordAgain) {
      setNotice({ type: 'error', message: 'Konfirmasi password belum sama.' })
      return
    }
    setBackupBusy(true)
    try {
      const backup = await createEncryptedWalletBackup(backupPassword)
      downloadEncryptedWallet(backup.fileName, backup.json)
      addActivity({ kind: 'backup', title: 'Encrypted wallet backup dibuat', detail: shortenAddress(backup.address), status: 'success' })
      setBackupPassword('')
      setBackupPasswordAgain('')
      setNotice({ type: 'success', message: `Backup encrypted untuk ${shortenAddress(backup.address)} diunduh.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Backup encrypted gagal dibuat.'
      setNotice({ type: 'error', message })
    } finally {
      setBackupBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="/" aria-label="GiwaTools home">
          <span className="brand-mark"><Zap size={16} strokeWidth={2.5} /></span>
          <span>GIWA<span className="brand-slash">/</span>TOOLS</span>
        </a>
        <nav className="app-nav" aria-label="Main menu"><button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => setActiveView('dashboard')}>Dashboard</button><button className={activeView === 'networks' ? 'active' : ''} onClick={() => setActiveView('networks')}>Networks</button><button className={activeView === 'deploy' ? 'active' : ''} onClick={() => setActiveView('deploy')}>Deploy Token</button></nav>
        <div className="topbar-meta">
          <span className="mono muted">TESTNET ONLY</span>
          <a className="explorer-link" href={GIWA_EXPLORER_URL} target="_blank" rel="noreferrer">Explorer <ExternalLink size={13} /></a>
        </div>
      </header>

      <main className="main-layout">
        <aside className="sidebar">
          <div className="eyebrow"><span className="signal-dot" /> NETWORK TELEMETRY</div>
          <h1>Operate with<br /><span>clarity.</span></h1>
          <p className="lede">Wallet operations yang transparan untuk GIWA Sepolia. Tidak ada private key mentah yang dikirim atau disimpan oleh aplikasi.</p>

          <section className="status-card">
            <div className="status-card-top"><span className={`status-pill ${statusTone}`}><span className="status-dot" /> {statusLabel}</span><Wifi size={15} /></div>
            <div className="status-value">{formattedBalance}<span> {selectedNetwork.symbol}</span></div>
            <div className="status-caption">Native balance <span className="mono">/ live polling 5s</span></div>
            <div className="status-divider" />
            <div className="mini-grid">
              <div><span>CHAIN</span><strong>{selectedNetwork.chainId}</strong></div>
              <div><span>BLOCK</span><strong>{balance.blockNumber?.toString() ?? '—'}</strong></div>
              <div><span>LAST READ</span><strong>{formatTime(balance.updatedAt)}</strong></div>
            </div>
            {balance.loading && <div className="read-line"><RefreshCw size={12} className="spin" /> membaca RPC GIWA…</div>}
            {balance.error && <div className="inline-error">{balance.error}</div>}
          </section>

          <section className="token-balance-card">
            <div className="section-kicker"><Coins size={14} /> TRACKED TOKEN</div>
            {trackedToken ? <>
              <div className="token-balance-top"><div><strong>{trackedToken.symbol}</strong><span>{trackedToken.name}</span></div><span className="token-network">{getNetwork(trackedToken.networkId).shortName}</span></div>
              <div className="token-balance-value">{Number(tokenBalance.amount).toLocaleString('id-ID', { maximumFractionDigits: 4 })}<span> {trackedToken.symbol}</span></div>
              <div className="status-caption">Wallet balance <span className="mono">/ auto read 5s</span></div>
              {tokenBalance.loading && <div className="read-line"><RefreshCw size={12} className="spin" /> membaca token…</div>}
              {tokenBalance.error && <div className="inline-error">{tokenBalance.error}</div>}
              {!wallet.address && <div className="micro-note"><span className="signal-dot" /> Hubungkan MetaMask untuk membaca saldo.</div>}
            </> : <p className="empty-copy">Deploy token dari menu Deploy Token untuk mulai melacak saldonya.</p>}
          </section>

          <section className="wallet-card">
            <div className="section-kicker"><Wallet size={14} /> ACTIVE WALLET</div>
            {wallet.connected ? (
              <>
                <div className="address-row"><span className="mono">{shortenAddress(wallet.address)}</span><button className="icon-button" onClick={() => wallet.address && void copyText(wallet.address, 'Address disalin.')} aria-label="Copy wallet address"><Copy size={14} /></button></div>
                <div className="wallet-source"><span className="signal-dot" /> {wallet.source === 'walletconnect' ? 'KLEVER WALLET / WALLETCONNECT' : wallet.source === 'metamask' ? 'METAMASK MOBILE CONNECT' : 'INJECTED EVM WALLET'}</div>
                <a className="sub-link mono" href={wallet.address ? explorerAddressUrl(wallet.address) : '#'} target="_blank" rel="noreferrer">open on explorer <ArrowUpRight size={12} /></a>
              </>
            ) : <p className="empty-copy">Hubungkan wallet untuk membaca balance real-time.</p>}
            {wallet.connected && !isSelectedChain && <button className="button button-outline full-width" onClick={() => void handleSelectNetwork(selectedNetworkId)}>Switch ke {selectedNetwork.name} <ChevronRight size={15} /></button>}
            {!wallet.connected && <div className="wallet-connect-stack"><button className="button button-primary full-width" onClick={() => void handleConnectMetaMaskMobile()}>Connect MetaMask Android <Link2 size={15} /></button><button className="button button-outline full-width" onClick={() => void handleConnectMetaMask()}>Connect MetaMask extension <Link2 size={15} /></button><button className="button button-outline full-width" onClick={() => void handleConnect()}>{hasInjectedWallet() ? 'Connect Klever langsung' : 'Buka di Klever Web3 browser'} <Link2 size={15} /></button><div className="micro-note"><span className="signal-dot" /> Android: tekan tombol pertama untuk membuka MetaMask dan kembali ke GiwaTools.</div></div>}
          </section>

          <div className="sidebar-footer"><span className="mono">RPC</span><span className="mono truncate">{selectedNetwork.rpcUrl}</span></div>
        </aside>

        <section className="workspace">
          {activeView === 'dashboard' && <>
          <div className="workspace-head">
            <div><div className="eyebrow">CONTROL SURFACE / 01</div><h2>Build a clean starting point.</h2></div>
            <div className="head-actions"><span className="secure-badge"><ShieldCheck size={15} /> non-custodial</span><button className="refresh-button" onClick={() => void refreshBalance()} disabled={!wallet.address}><RefreshCw size={15} /> Refresh</button></div>
          </div>

          {notice && <div className={`notice ${notice.type}`}><span>{notice.type === 'success' ? <Check size={15} /> : notice.type === 'error' ? <XCircle size={15} /> : <Activity size={15} />}</span>{notice.message}<button className="notice-close" onClick={() => setNotice(null)} aria-label="Tutup notifikasi">×</button></div>}

          <div className="control-grid">
            <section className="panel generator-panel">
              <div className="panel-heading"><div className="icon-tile lime"><Sparkles size={17} /></div><div><div className="eyebrow">TOKEN IDENTITY / 02</div><h3>Generate a name</h3></div></div>
              <p className="panel-copy">Buat identitas awal untuk token testnet. Hasil ini belum menjadi token on-chain sampai Anda menyiapkan factory yang telah diverifikasi.</p>
              <div className="token-preview"><div><span className="field-label">NAME</span><strong>{token.name}</strong></div><div className="token-symbol"><span className="field-label">SYMBOL</span><strong>{token.symbol}</strong></div></div>
              <div className="panel-actions"><button className="button button-primary" onClick={regenerateToken}>Generate again <RefreshCw size={15} /></button><button className="button button-ghost" onClick={() => void copyText(`${token.name} / ${token.symbol}`, 'Token identity disalin.')}><Clipboard size={15} /> Copy</button></div>
              <div className="micro-note"><span className="signal-dot" /> CSPRNG browser / format checked</div>
            </section>

            <section className="panel transaction-panel">
              <div className="panel-heading"><div className="icon-tile amber"><LockKeyhole size={17} /></div><div><div className="eyebrow">TRANSACTION POLICY / 03</div><h3>Safe by default</h3></div></div>
              <p className="panel-copy">Deploy dan swap belum mengirim transaksi otomatis. Setiap aksi on-chain harus menampilkan target, network, nominal, simulasi, dan approval wallet.</p>
              <div className="policy-list"><div><Check size={14} /><span>GIWA Sepolia allowlist</span><span className="policy-state">READY</span></div><div><Check size={14} /><span>Arbitrary calldata</span><span className="policy-state blocked">BLOCKED</span></div><div><Check size={14} /><span>Official swap router</span><span className="policy-state pending">NOT CONFIGURED</span></div></div>
              <div className="guardrail"><ShieldCheck size={16} /><span>Swap hanya dapat diaktifkan setelah router resmi/terverifikasi masuk registry.</span></div>
            </section>
          </div>

          <section className="panel trend-panel">
            <div className="trend-heading">
              <div className="panel-heading"><div className="icon-tile lime"><Activity size={17} /></div><div><div className="eyebrow">TRANSACTION PULSE / 06</div><h3>Live transaction trend</h3></div></div>
              <div className="trend-stat"><strong>{transactionTotal.toString().padStart(2, '0')}</strong><span>ALL TIME<br />SUBMITTED</span></div>
            </div>
            <p className="panel-copy">Aktivitas deployment yang dikirim dari sesi browser ini, dikelompokkan per 5 detik selama 1 menit terakhir.</p>
            <div className="trend-chart" aria-label="Grafik tren transaksi real-time">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={transactionTrend} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="transactionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#b9ef69" stopOpacity={0.34} />
                      <stop offset="100%" stopColor="#b9ef69" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(204,220,238,.08)" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#66758a', fontSize: 9, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis allowDecimals={false} tick={{ fill: '#66758a', fontSize: 9, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip contentStyle={{ border: '1px solid rgba(204,220,238,.16)', borderRadius: 9, background: '#131d2b', color: '#eef2f6', fontFamily: 'DM Mono', fontSize: 10 }} labelStyle={{ color: '#8290a4' }} cursor={{ stroke: 'rgba(185,239,105,.3)' }} />
                  <Area type="monotone" dataKey="transactions" name="Transactions" stroke="#b9ef69" strokeWidth={2} fill="url(#transactionGradient)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="trend-footer"><span><span className="signal-dot" /> AUTO REFRESH / 5S</span><span className="mono">{selectedNetwork.shortName} · LOCAL SESSION</span></div>
          </section>

          <section className="panel backup-panel">
            <div className="backup-layout"><div className="panel-heading"><div className="icon-tile violet"><KeyRound size={17} /></div><div><div className="eyebrow">LOCAL WALLET LAB / 04</div><h3>Encrypted wallet backup</h3></div></div><div className="backup-tag"><Download size={14} /> browser-only</div></div>
            <p className="panel-copy">Buat wallet testnet baru di browser lalu unduh backup terenkripsi. Private key tidak pernah ditampilkan, tidak diunggah, dan tidak disimpan oleh GiwaTools. Format backup ini khusus GiwaTools.</p>
            <div className="backup-form"><label><span className="field-label">PASSWORD / MIN 12 CHAR</span><input type="password" value={backupPassword} onChange={(event) => setBackupPassword(event.target.value)} placeholder="Password kuat untuk file backup" autoComplete="new-password" /></label><label><span className="field-label">CONFIRM PASSWORD</span><input type="password" value={backupPasswordAgain} onChange={(event) => setBackupPasswordAgain(event.target.value)} placeholder="Ulangi password" autoComplete="new-password" /></label><button className="button button-primary backup-button" onClick={() => void handleBackup()} disabled={backupBusy}>{backupBusy ? <><RefreshCw size={15} className="spin" /> encrypting…</> : <><Download size={15} /> Generate & download</>}</button></div>
            <div className="micro-note warning-note"><ShieldCheck size={13} /> Jangan unggah file backup atau password ke GitHub, Vercel, chat, atau siapa pun.</div>
          </section>

          <section className="panel token-history-panel">
            <div className="activity-head token-history-head"><div><div className="eyebrow">ON-CHAIN LEDGER / 08</div><h3>{trackedToken ? `${trackedToken.symbol} transaction history` : 'Token transaction history'}</h3></div><span className="mono muted">{tokenTransfers.length.toString().padStart(2, '0')} TRANSFERS</span></div>
            <p className="panel-copy">Event <span className="mono">Transfer</span> dari kontrak token terpantau, diambil langsung dari 10.000 block terakhir dan diperbarui setiap 5 detik.</p>
            {tokenTransfersLoading && <div className="read-line"><RefreshCw size={12} className="spin" /> membaca event Transfer…</div>}
            {tokenTransfersError && <div className="inline-error">{tokenTransfersError}</div>}
            {!trackedToken ? <div className="empty-state"><Activity size={18} /><span>Deploy token terlebih dahulu untuk membuka riwayat transfer on-chain.</span></div> : tokenTransfers.length === 0 && !tokenTransfersLoading ? <div className="empty-state"><Activity size={18} /><span>Belum ada event transfer pada rentang block yang dibaca.</span></div> : <div className="token-history-list">{tokenTransfers.map((transfer) => <div className="token-history-row" key={`${transfer.hash}-${transfer.from}-${transfer.to}`}><div className="token-history-icon"><ArrowUpRight size={14} /></div><div className="token-history-copy"><strong>{Number(transfer.value).toLocaleString('id-ID', { maximumFractionDigits: 4 })} {trackedToken.symbol}</strong><span><span className="mono">{shortenAddress(transfer.from)}</span> <ChevronRight size={11} /> <span className="mono">{shortenAddress(transfer.to)}</span></span></div><div className="token-history-meta"><span className="mono">BLOCK {transfer.blockNumber.toString()}</span><a href={explorerTxUrlFor(trackedToken.networkId, transfer.hash)} target="_blank" rel="noreferrer">VIEW TX <ExternalLink size={11} /></a></div></div>)}</div>}
            {trackedToken && <div className="trend-footer token-history-footer"><span><span className="signal-dot" /> LIVE RPC INDEX</span><span className="mono">{getNetwork(trackedToken.networkId).shortName} · LAST 10K BLOCKS</span></div>}
          </section>

          <section className="activity-section"><div className="activity-head"><div><div className="eyebrow">LOCAL ACTIVITY / 05</div><h3>Recent signals</h3></div><span className="mono muted">{activities.length.toString().padStart(2, '0')} EVENTS</span></div>{activities.length === 0 ? <div className="empty-state"><Activity size={18} /><span>Belum ada aktivitas. Connect wallet atau generate token untuk mulai.</span></div> : <div className="activity-list">{activities.slice(0, 6).map((item) => <div className="activity-row" key={item.id}><span className={`activity-icon ${item.status}`}>{item.status === 'success' ? <Check size={14} /> : item.status === 'error' ? <XCircle size={14} /> : <Activity size={14} />}</span><div className="activity-copy"><strong>{item.title}</strong><span>{item.detail}</span></div><time className="mono">{formatTime(item.createdAt)}</time></div>)}</div>}</section>
          </>}
          {activeView === 'networks' && <section className="menu-view"><div className="workspace-head"><div><div className="eyebrow">NETWORK CONTROL / 06</div><h2>Choose your testnet.</h2></div><span className="secure-badge">3 RPC endpoints</span></div><p className="panel-copy menu-lede">Pilih network untuk membaca balance, menambahkan chain ke wallet, dan menyiapkan target deploy. Semua network di bawah adalah testnet.</p><div className="network-list">{Object.values(APP_NETWORKS).map((network) => <button className={`network-card ${selectedNetworkId === network.id ? 'selected' : ''}`} key={network.id} onClick={() => void handleSelectNetwork(network.id)}><div className="network-card-top"><div><span className="eyebrow">CHAIN {network.chainId}</span><h3>{network.name}</h3></div><span className="network-symbol">{network.symbol}</span></div><div className="network-meta"><span>RPC</span><strong>{network.rpcUrl}</strong></div><div className="network-meta"><span>EXPLORER</span><strong>{network.explorerUrl.replace('https://', '')}</strong></div><div className="network-action">{selectedNetworkId === network.id ? 'SELECTED / ACTIVE TARGET' : 'USE THIS NETWORK'} <ChevronRight size={15} /></div></button>)}</div><div className="guardrail"><ShieldCheck size={16} /><span>Testnet only. Pastikan wallet memiliki token gas yang sesuai: ETH untuk Sepolia/GIWA dan tBNB untuk BSC Testnet.</span></div></section>}
          {activeView === 'deploy' && <section className="menu-view"><div className="workspace-head"><div><div className="eyebrow">SMART CONTRACT / 07</div><h2>Deploy a test token.</h2></div><span className="secure-badge">approval required</span></div><p className="panel-copy menu-lede">Deploy ERC-20 minimal ke network pilihan. Tidak ada transaksi otomatis: GiwaTools menyiapkan bytecode, meminta switch network, lalu wallet menampilkan approval.</p><div className="deploy-layout"><section className="panel deploy-form-panel"><div className="panel-heading"><div className="icon-tile lime"><Zap size={17} /></div><div><div className="eyebrow">TOKEN PARAMETERS</div><h3>Token configuration</h3></div></div><label className="form-field"><span className="field-label">TOKEN NAME</span><input value={deployName} onChange={(event) => setDeployName(event.target.value)} placeholder="My Test Token" /></label><label className="form-field"><span className="field-label">SYMBOL</span><input value={deploySymbol} onChange={(event) => setDeploySymbol(event.target.value.toUpperCase().slice(0, 8))} placeholder="MTK" /></label><label className="form-field"><span className="field-label">INITIAL SUPPLY / 18 DECIMALS</span><input inputMode="decimal" value={deploySupply} onChange={(event) => setDeploySupply(event.target.value.replace(/[^0-9.]/g, ''))} placeholder="1000000" /></label><button className="button button-primary full-width deploy-submit" onClick={() => void handleDeployToken()} disabled={deployBusy}>{deployBusy ? <><RefreshCw size={15} className="spin" /> Preparing approval…</> : <>Deploy token on {selectedNetwork.shortName} <ArrowUpRight size={15} /></>}</button></section><section className="panel deploy-preview"><div className="eyebrow">DEPLOYMENT PREVIEW</div><div className="deploy-preview-row"><span>NETWORK</span><strong>{selectedNetwork.name}</strong></div><div className="deploy-preview-row"><span>CHAIN ID</span><strong>{selectedNetwork.chainId}</strong></div><div className="deploy-preview-row"><span>CONTRACT</span><strong>GiwaToolsToken / ERC-20</strong></div><div className="deploy-preview-row"><span>OWNER</span><strong>{wallet.address ? shortenAddress(wallet.address) : 'Connect wallet first'}</strong></div><div className="guardrail"><ShieldCheck size={16} /><span>Review network, token values, gas fee, and wallet approval before signing.</span></div><button className="button button-ghost full-width" onClick={() => setActiveView('networks')}>Change target network <ChevronRight size={15} /></button></section></div></section>}
        </section>
      </main>

      <footer className="footer"><span>GiwaTools / a transparent testnet surface</span><span className="mono">CHAIN {selectedNetwork.chainId} · {selectedNetwork.symbol} · TESTNET</span></footer>
    </div>
  )
}

export default App
