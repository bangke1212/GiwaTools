# TODO GiwaTools

## Koneksi wallet non-custodial

- [x] Sediakan tombol connect wallet berbasis EIP-1193.
- [x] Tampilkan address terpotong, chain ID, network label, dan status koneksi.
- [x] Tangani `accountsChanged`, `chainChanged`, dan disconnect.
- [x] Sediakan tombol switch ke GIWA Sepolia bila wallet mendukung `wallet_switchEthereumChain`.
- [x] Jangan pernah meminta, menampilkan, mengirim, atau menyimpan private key mentah.

## Balance wallet real-time

- [x] Baca saldo native ETH dari GIWA Sepolia RPC.
- [x] Refresh otomatis setiap 5 detik ketika wallet terhubung.
- [x] Refresh segera setelah perubahan account atau chain.
- [x] Tampilkan timestamp pembacaan terakhir dan state loading/error.
- [x] Format saldo tanpa floating point yang tidak aman.

## Generator nama token

- [x] Sediakan generator nama token dan simbol acak.
- [x] Validasi nama 1–64 karakter.
- [x] Validasi simbol 3–8 karakter uppercase alfanumerik.
- [x] Sediakan tombol generate ulang dan copy.
- [x] Beri label bahwa hasil generator belum merupakan token on-chain.

## Encrypted keystore lokal

- [x] Sediakan panel export encrypted wallet backup yang membuat wallet testnet baru secara lokal tanpa menampilkan private key.
- [x] Password wajib dimasukkan dua kali dan memenuhi minimum strength.
- [x] Proses enkripsi berlangsung lokal dan file langsung diunduh.
- [x] Tidak ada fetch/XHR untuk nilai private key atau keystore.
- [x] Jangan menyimpan file backup, password, atau private key ke localStorage/sessionStorage/database/log.
- [x] Jelaskan bahwa pengguna bertanggung jawab atas backup file dan password.

## Transaction safety dan activity

- [ ] Tampilkan status ready, pending, confirmed, failed, atau cancelled.
- [ ] Untuk transaksi, tampilkan chain, target, value, dan explorer link.
- [x] Simpan hanya metadata aktivitas non-rahasia di localStorage.
- [x] Tambahkan security notice bahwa swap belum diaktifkan tanpa router resmi/terverifikasi.

## Menu Networks

- [x] Tampilkan pilihan Ethereum Sepolia (chain ID 11155111), BNB Smart Chain Testnet (chain ID 97), dan GIWA Testnet (chain ID 91342) dalam menu terpisah dari dashboard.
- [x] Tampilkan RPC, simbol native, explorer, dan status selected target untuk setiap testnet.
- [x] Izinkan pemilihan network dan minta wallet berpindah chain melalui `wallet_switchEthereumChain`; tambahkan chain bila provider mengembalikan 4902.
- [x] Balance mengikuti network yang dipilih dan polling ulang setiap 5 detik.

## Menu Deploy Token

- [x] Sediakan menu terpisah `Deploy Token`, tidak digabung dalam satu frame dashboard.
- [x] Sediakan form token name, symbol, initial supply, network target, owner wallet, dan preview kontrak ERC-20 minimal.
- [x] Siapkan bytecode deployment lokal dan minta approval wallet setelah network, parameter, dan target ditampilkan.
- [x] Tidak mengirim transaksi otomatis tanpa klik pengguna; tampilkan error jika wallet belum terhubung atau transaksi ditolak.

## Vercel readiness

- [x] Build static berhasil.
- [x] Sediakan `vercel.json` yang tidak memuat secret.
- [x] Sediakan route manifest `/manus-routes.json`.
- [x] Sediakan `.env.example` hanya untuk konfigurasi publik opsional.
- [x] Pastikan tidak ada private key, seed phrase, encrypted keystore, atau secret di repository.

## Repository delivery

- [ ] Buat commit terarah di branch `main`.
- [ ] Fetch dan preserve remote state sebelum push.
- [ ] Push normal tanpa force-push.
- [ ] Verifikasi commit SHA dan working tree bersih.
