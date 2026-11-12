import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { GIWA_CHAIN_ID } from './giwa'

const encoder = new TextEncoder()
const ITERATIONS = 210_000

type EncryptedWalletFile = {
  format: 'giwatools-encrypted-wallet'
  version: 1
  address: `0x${string}`
  chainId: number
  createdAt: string
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string }
  cipher: { name: 'AES-GCM'; iv: string; ciphertext: string }
  warning: string
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function deriveKey(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )
}

export async function createEncryptedWalletBackup(password: string) {
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify({ privateKey })),
  )

  const file: EncryptedWalletFile = {
    format: 'giwatools-encrypted-wallet',
    version: 1,
    address: account.address,
    chainId: GIWA_CHAIN_ID,
    createdAt: new Date().toISOString(),
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: bytesToHex(salt) },
    cipher: { name: 'AES-GCM', iv: bytesToHex(iv), ciphertext: bytesToHex(new Uint8Array(encrypted)) },
    warning: 'App-specific encrypted backup. Never share this file or its password. The unencrypted private key is not included in the UI.',
  }

  return {
    address: account.address,
    fileName: `giwatools-wallet-${account.address.slice(0, 8)}.json`,
    json: JSON.stringify(file, null, 2),
  }
}

export function downloadEncryptedWallet(fileName: string, json: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}
