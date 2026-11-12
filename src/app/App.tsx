import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUpRight, Check, ChevronRight, Clipboard, Copy, Download, ExternalLink, KeyRound, Link2, LockKeyhole, RefreshCw, ShieldCheck, Smartphone, Sparkles, Wallet, Wifi, XCircle, Zap } from 'lucide-react'
import { formatEther } from 'viem'
import { GIWA_CHAIN_ID, GIWA_EXPLORER_URL, GIWA_RPC_URL, explorerAddressUrl, publicClient } from '../lib/giwa'
import { createEncryptedWalletBackup, downloadEncryptedWallet } from '../lib/keystore'
import { formatEth, formatTime, shortenAddress, chainLabel } from '../lib/format'
import { readActivities, writeActivities } from '../lib/storage'
import { generateTokenIdentity } from '../lib/token-names'
import { connectInjectedWallet, connectKleverWallet, getConnectedWallet, getInjectedProvider, hasInjectedWallet, hasWalletConnectConfig, switchToGiwaSepolia } from '../lib/wallet'
import type { ActivityRecord, BalanceState, WalletState } from '../types/wallet'

const initialWallet: WalletState = { address: null, chainId: null, connected: false, source: null, error: null }
const initialBalance: BalanceState = { eth: '0', blockNumber: null, updatedAt: null, loading: false, error: null }

function createActivity(input: Omit<ActivityRecord, 'id' | 'createdAt'>): ActivityRecord {
  return { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
}

function App() {
  const [wallet, setWallet] = useState<WalletState>(initialWallet)
  const [balance, setBalance] = useState<BalanceState>(initialBalance)
  const [token, setToken] = useState(generateTokenIdentity)
  const [activities, setActivities] = useState<ActivityRecord[]>(() => readActivities())
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [backupPassword, setBackupPassword] = useState('')
  const [backupPasswordAgain, setBackupPasswordAgain] = useState('')
  const [backupBusy, setBackupBusy] = useState(false)

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
        publicClient.getBalance({ address }),
        publicClient.getBlockNumber(),
      ])
      setBalance({ eth: formatEther(rawBalance), blockNumber, updatedAt: new Date(), loading: false, error: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'RPC GIWA belum merespons.'
      setBalance((current) => ({ ...current, loading: false, error: message }))
    }
  }, [wallet.address])

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

  const isGiwa = wallet.chainId === GIWA_CHAIN_ID
  const statusLabel = wallet.connected ? (isGiwa ? 'LIVE / GIWA SEPOLIA' : 'NETWORK REVIEW') : 'WALLET OFFLINE'
  const statusTone = wallet.connected && isGiwa ? 'live' : wallet.connected ? 'warn' : 'idle'
  const formattedBalance = useMemo(() => {
    try {
      return Number(balance.eth).toLocaleString('id-ID', { maximumFractionDigits: 6 })
    } catch {
      return '0'
    }
  }, [balance.eth])

  async function handleConnect() {
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

  async function handleConnectKlever() {
    try {
      const connected = await connectKleverWallet()
      setWallet({ ...connected, connected: true, error: null })
      addActivity({ kind: 'wallet', title: 'Klever Wallet connected', detail: `${shortenAddress(connected.address)} / WalletConnect`, status: 'success' })
      setNotice({ type: 'success', message: `Klever Wallet ${shortenAddress(connected.address)} terhubung melalui WalletConnect.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Klever Wallet gagal terhubung.'
      setWallet((current) => ({ ...current, error: message }))
      setNotice({ type: 'error', message })
    }
  }

  async function handleSwitchNetwork() {
    try {
      await switchToGiwaSepolia(wallet.source || 'injected')
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
            <div className="status-value">{formattedBalance}<span> ETH</span></div>
            <div className="status-caption">Native balance <span className="mono">/ live polling 5s</span></div>
            <div className="status-divider" />
            <div className="mini-grid">
              <div><span>CHAIN</span><strong>{wallet.chainId ?? '—'}</strong></div>
              <div><span>BLOCK</span><strong>{balance.blockNumber?.toString() ?? '—'}</strong></div>
              <div><span>LAST READ</span><strong>{formatTime(balance.updatedAt)}</strong></div>
            </div>
            {balance.loading && <div className="read-line"><RefreshCw size={12} className="spin" /> membaca RPC GIWA…</div>}
            {balance.error && <div className="inline-error">{balance.error}</div>}
          </section>

          <section className="wallet-card">
            <div className="section-kicker"><Wallet size={14} /> ACTIVE WALLET</div>
            {wallet.connected ? (
              <>
                <div className="address-row"><span className="mono">{shortenAddress(wallet.address)}</span><button className="icon-button" onClick={() => wallet.address && void copyText(wallet.address, 'Address disalin.')} aria-label="Copy wallet address"><Copy size={14} /></button></div>
                <div className="wallet-source"><span className="signal-dot" /> {wallet.source === 'walletconnect' ? 'KLEVER WALLET / WALLETCONNECT' : 'INJECTED EVM WALLET'}</div>
                <a className="sub-link mono" href={wallet.address ? explorerAddressUrl(wallet.address) : '#'} target="_blank" rel="noreferrer">open on explorer <ArrowUpRight size={12} /></a>
              </>
            ) : <p className="empty-copy">Hubungkan wallet untuk membaca balance real-time.</p>}
            {wallet.connected && !isGiwa && <button className="button button-outline full-width" onClick={() => void handleSwitchNetwork()}>Switch ke GIWA Sepolia <ChevronRight size={15} /></button>}
            {!wallet.connected && <div className="wallet-connect-stack"><button className="button button-primary full-width" onClick={() => void handleConnect()} disabled={!hasInjectedWallet()}>{hasInjectedWallet() ? 'Connect browser wallet' : 'Buka dApp di Klever browser'} <Link2 size={15} /></button><button className="button button-klever full-width" onClick={() => void handleConnectKlever()} disabled={!hasWalletConnectConfig()}><Smartphone size={15} /> Connect Klever Android <span className="wc-label">WalletConnect</span></button>{!hasWalletConnectConfig() && <div className="micro-note">Set <span className="mono">VITE_WALLETCONNECT_PROJECT_ID</span> untuk mengaktifkan QR/deep-link Klever.</div>}</div>}
          </section>

          <div className="sidebar-footer"><span className="mono">RPC</span><span className="mono truncate">{GIWA_RPC_URL}</span></div>
        </aside>

        <section className="workspace">
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

          <section className="panel backup-panel">
            <div className="backup-layout"><div className="panel-heading"><div className="icon-tile violet"><KeyRound size={17} /></div><div><div className="eyebrow">LOCAL WALLET LAB / 04</div><h3>Encrypted wallet backup</h3></div></div><div className="backup-tag"><Download size={14} /> browser-only</div></div>
            <p className="panel-copy">Buat wallet testnet baru di browser lalu unduh backup terenkripsi. Private key tidak pernah ditampilkan, tidak diunggah, dan tidak disimpan oleh GiwaTools. Format backup ini khusus GiwaTools.</p>
            <div className="backup-form"><label><span className="field-label">PASSWORD / MIN 12 CHAR</span><input type="password" value={backupPassword} onChange={(event) => setBackupPassword(event.target.value)} placeholder="Password kuat untuk file backup" autoComplete="new-password" /></label><label><span className="field-label">CONFIRM PASSWORD</span><input type="password" value={backupPasswordAgain} onChange={(event) => setBackupPasswordAgain(event.target.value)} placeholder="Ulangi password" autoComplete="new-password" /></label><button className="button button-primary backup-button" onClick={() => void handleBackup()} disabled={backupBusy}>{backupBusy ? <><RefreshCw size={15} className="spin" /> encrypting…</> : <><Download size={15} /> Generate & download</>}</button></div>
            <div className="micro-note warning-note"><ShieldCheck size={13} /> Jangan unggah file backup atau password ke GitHub, Vercel, chat, atau siapa pun.</div>
          </section>

          <section className="activity-section"><div className="activity-head"><div><div className="eyebrow">LOCAL ACTIVITY / 05</div><h3>Recent signals</h3></div><span className="mono muted">{activities.length.toString().padStart(2, '0')} EVENTS</span></div>{activities.length === 0 ? <div className="empty-state"><Activity size={18} /><span>Belum ada aktivitas. Connect wallet atau generate token untuk mulai.</span></div> : <div className="activity-list">{activities.slice(0, 6).map((item) => <div className="activity-row" key={item.id}><span className={`activity-icon ${item.status}`}>{item.status === 'success' ? <Check size={14} /> : item.status === 'error' ? <XCircle size={14} /> : <Activity size={14} />}</span><div className="activity-copy"><strong>{item.title}</strong><span>{item.detail}</span></div><time className="mono">{formatTime(item.createdAt)}</time></div>)}</div>}</section>
        </section>
      </main>

      <footer className="footer"><span>GiwaTools / a transparent testnet surface</span><span className="mono">CHAIN {GIWA_CHAIN_ID} · ETH · 1s blocks</span></footer>
    </div>
  )
}

export default App
