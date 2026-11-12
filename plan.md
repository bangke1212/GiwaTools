# Plan GiwaTools

## Ruang lingkup

GiwaTools adalah DApp frontend untuk GIWA Sepolia Testnet. Fokus versi pertama adalah koneksi wallet non-custodial, generator nama dan simbol token acak, pembacaan saldo ETH secara real-time, export encrypted keystore yang diproses hanya di browser, serta alur transaksi yang selalu terlihat dan dikonfirmasi pengguna.

Private key mentah tidak pernah ditampilkan, dikirim ke backend, disimpan di localStorage, database, log, atau repository. Encrypted keystore hanya dibuat di memory browser lalu diunduh sebagai file oleh pengguna. Aplikasi tidak memiliki backend signer dan tidak mengirim arbitrary calldata.

## Keputusan teknis

- Stack: React + TypeScript + Vite.
- Blockchain client: viem.
- Wallet connection: EIP-1193 provider dari browser wallet melalui `window.ethereum`.
- Network default: GIWA Sepolia, chain ID `91342`.
- RPC fallback: `https://sepolia-rpc.giwa.io`.
- Explorer: `https://sepolia-explorer.giwa.io`.
- Real-time balance: polling berkala 5 detik saat wallet terhubung, ditambah listener `accountsChanged` dan `chainChanged`.
- Keystore: viem `keystoreJson`/`privateKeyToAccount` hanya di browser; file tidak diunggah.
- Transaksi: user-signed only; setiap transaksi menampilkan target, network, nominal, dan status.
- Swap: tidak diaktifkan karena dokumentasi GIWA belum mencantumkan router/DEX resmi. UI menjelaskan status ini tanpa memasukkan alamat router placeholder.
- Deployment: output static siap untuk Vercel.

## Struktur proyek

```text
src/
├── app/
│   ├── App.tsx
│   └── app.config.ts
├── components/
│   ├── BrandMark.tsx
│   ├── WalletPanel.tsx
│   ├── TokenGenerator.tsx
│   ├── BalancePanel.tsx
│   ├── TransactionPanel.tsx
│   ├── SecurityNotice.tsx
│   └── ActivityLog.tsx
├── lib/
│   ├── giwa.ts
│   ├── wallet.ts
│   ├── token-names.ts
│   ├── keystore.ts
│   ├── storage.ts
│   └── format.ts
├── types/
│   └── wallet.ts
├── main.tsx
└── styles.css
public/
└── manus-routes.json
```

## Desain visual

Tiga arah gaya yang dipertimbangkan:

- **Crypto operations cockpit** (0.07): panel gelap padat, aksen lime, status transaksi seperti terminal operasi.
- **Editorial fintech** (0.05): latar hangat, serif modern, kartu laporan dengan nuansa majalah.
- **Soft utility** (0.03): latar terang, biru elektrik, komponen bulat dengan onboarding sangat ringan.

Pilihan: **Crypto operations cockpit**.

**Design Movement:** terminal-luxe yang memadukan dashboard operasi dan editorial teknologi; terasa serius untuk transaksi, tetapi tetap mudah dibaca.

**Core Principles:** status selalu terlihat; tindakan berisiko selalu memiliki konteks; informasi penting memiliki hirarki yang tegas; kontrol utama tidak disembunyikan.

**Color Philosophy:** latar ink navy memberi ruang visual yang tenang; lime digunakan sebagai signature color untuk koneksi sehat dan aksi utama; amber menandai review; rose menandai risiko; teks putih hangat menjaga keterbacaan.

**Layout Paradigm:** layout dua kolom asimetris pada desktop: rail kiri berisi identitas, status jaringan, dan saldo utama; canvas kanan berisi generator dan aktivitas. Pada mobile layout menjadi alur vertikal dengan status wallet tetap berada di atas.

**Signature Elements:** grid mikro seperti monitor jaringan, garis status lime, dan angka saldo besar dengan label kecil bergaya telemetry.

**Interaction Philosophy:** setiap aksi memerlukan satu langkah yang jelas; state loading tidak menghilangkan konteks; error menjelaskan cara pulih; aplikasi tidak pernah menampilkan atau menyimpan private key mentah.

**Animation:** transisi 160–220ms; pulse halus hanya pada status live; angka saldo berubah dengan fade singkat; tidak ada animasi dekoratif yang mengganggu approval transaksi.

**Typography System:** gunakan `Space Grotesk` untuk heading dan `IBM Plex Mono` untuk address, chain ID, nominal, dan status transaksi. Fallback sistem harus tetap aman jika font remote tidak tersedia.

**Brand Essence:** alat operasi GIWA yang transparan untuk mencoba wallet dan token di testnet; tegas, aman, inspectable.

**Brand Voice:** ringkas, langsung, tidak menjanjikan keamanan absolut. Contoh: “Saldo live dari GIWA Sepolia.” dan “Kunci tidak pernah meninggalkan browser.”

**Wordmark & Logo:** wordmark `GIWA / TOOLS` dengan slash sebagai motif pemisah antara jaringan dan tindakan.

**Signature Brand Color:** acid lime `#C7F36B`.

## Acceptance outcome

- User dapat menghubungkan wallet EIP-1193 dan melihat address serta network.
- Aplikasi menolak atau memberi tindakan jelas ketika chain bukan GIWA Sepolia.
- Saldo ETH ditampilkan ulang secara real-time tanpa reload halaman.
- Generator menghasilkan name/symbol acak dengan format valid dan tombol copy.
- Export keystore meminta password, membuat file encrypted lokal, dan tidak melakukan network request.
- Tidak ada field atau endpoint untuk private key mentah.
- Riwayat aktivitas transaksi disimpan lokal sebagai metadata non-rahasia.
- Aplikasi dapat dibangun sebagai static output untuk Vercel.
- Route manifest tersedia di `/manus-routes.json`.
