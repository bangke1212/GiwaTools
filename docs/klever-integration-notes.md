# Catatan integrasi Klever Wallet

Tanggal pemeriksaan: 2026-11-12

## Sumber resmi

- Klever Web App SDK: https://docs.klever.org/javascript-sdk/web-app
- Klever Connect GitHub: https://github.com/klever-io/klever-connect
- WalletConnect Apps Overview: https://docs.walletconnect.com/apps/overview
- Klever Wallet WalletConnect announcement: https://medium.com/klever-news/walletconnect-is-now-available-in-klever-wallet-any-dapp-anytime-e69ca93e6ff6

## Temuan

Dokumentasi Klever Web App SDK menunjukkan `@klever/connect` dan `BrowserWallet` untuk koneksi ke Klever Blockchain/native wallet dan Klever Extension. Dokumentasi juga memperingatkan private-key mode hanya untuk development/testing.

Klever Connect README menjelaskan bahwa Klever Blockchain memakai address Bech32 `klv1...`, model biaya bandwidth/kAppFee, dan bukan EVM chain. Karena GiwaTools menargetkan GIWA Sepolia EVM chain ID `91342`, SDK native Klever tidak digunakan untuk membaca balance atau menandatangani transaksi GIWA.

WalletConnect adalah jalur mobile yang tepat. Dokumentasi WalletConnect menyatakan App SDK menyediakan modal koneksi dan dukungan wallet lintas EVM. Klever mengumumkan WalletConnect tersedia di Klever Wallet, sehingga GiwaTools menambahkan adapter `@walletconnect/ethereum-provider` untuk session EVM mobile.

Integrasi memerlukan `VITE_WALLETCONNECT_PROJECT_ID`, yang merupakan konfigurasi publik dari WalletConnect Cloud. Token, private key, atau seed phrase tidak boleh ditempatkan dalam environment variable frontend.

## Keputusan implementasi

- Pertahankan koneksi browser EIP-1193.
- Tambahkan koneksi Klever melalui WalletConnect QR/deep-link.
- Gunakan chain custom GIWA Sepolia `eip155:91342` dengan RPC resmi.
- Saldo tetap dibaca dari public RPC GIWA, bukan dari SDK native Klever.
- Jangan menambahkan deep link Klever yang tidak terdokumentasi.
- Jika project ID belum dikonfigurasi, UI menampilkan instruksi dan tidak membuat session palsu.
