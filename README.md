# GiwaTools

GiwaTools adalah DApp frontend-only untuk GIWA Sepolia Testnet.

## Fitur

- Connect wallet EIP-1193 secara non-custodial.
- Baca saldo ETH dari GIWA Sepolia secara real-time setiap 5 detik.
- Generate nama dan simbol token menggunakan CSPRNG browser.
- Buat wallet testnet baru dan unduh encrypted wallet backup secara lokal.
- Activity log hanya menyimpan metadata non-rahasia di browser.
- Tidak ada private key mentah yang ditampilkan, dikirim, atau disimpan.
- Tidak ada arbitrary calldata dan tidak ada backend signer.
- Swap sengaja belum diaktifkan sampai router resmi/terverifikasi tersedia.

## Development

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
