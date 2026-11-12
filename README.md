# GiwaTools

GiwaTools adalah DApp frontend-only untuk GIWA Sepolia Testnet.

## Fitur

- Connect wallet EIP-1193 secara non-custodial.
- Connect Klever Wallet Android melalui WalletConnect QR/deep-link.
- Baca saldo ETH dari GIWA Sepolia secara real-time setiap 5 detik.
- Generate nama dan simbol token menggunakan CSPRNG browser.
- Buat wallet testnet baru dan unduh encrypted wallet backup secara lokal.
- Activity log hanya menyimpan metadata non-rahasia di browser.
- Tidak ada private key mentah yang ditampilkan, dikirim, atau disimpan.
- Tidak ada arbitrary calldata dan tidak ada backend signer.
- Swap sengaja belum diaktifkan sampai router resmi/terverifikasi tersedia.

## Development

Untuk mengaktifkan tombol Klever Wallet Android, buat project publik di WalletConnect Cloud lalu isi `VITE_WALLETCONNECT_PROJECT_ID` pada environment Vercel/local. Jangan masukkan private key atau seed phrase ke environment variable.

Saat dApp dibuka langsung di Klever Wallet dApp browser, tombol browser wallet juga dapat memakai provider EIP-1193 yang diinjeksi wallet. SDK `@klever/connect` native tidak digunakan untuk balance GIWA karena SDK tersebut menargetkan Klever Blockchain dengan address `klv1...`, bukan GIWA Sepolia EVM.

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm typecheck
pnpm build
```

## Catatan backup

Backup yang dibuat adalah format encrypted khusus GiwaTools. File dan password harus disimpan secara offline dan tidak boleh diunggah ke GitHub, Vercel, atau layanan chat. GiwaTools tidak dapat memulihkan password yang hilang.
