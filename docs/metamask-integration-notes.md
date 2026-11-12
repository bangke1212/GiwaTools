# Catatan MetaMask mobile

- Quickstart resmi MetaMask Connect EVM: https://docs.metamask.io/metamask-connect/evm/quickstart/javascript/
- Provider API resmi: https://docs.metamask.io/metamask-connect/evm/reference/provider-api/

MetaMask Connect EVM menyediakan provider EIP-1193 yang kompatibel dengan viem dan menangani koneksi extension desktop, QR mobile, dan deeplink. `createEVMClient` memerlukan `dapp`, `api.supportedNetworks`, dan dapat diberi konfigurasi `mobile`. GIWA Sepolia dikonfigurasi sebagai chain hex `0x164ce` dengan RPC `https://sepolia-rpc.giwa.io`.

Untuk koneksi desktop sederhana, provider EIP-1193 yang diinjeksi MetaMask dapat dipanggil dengan `eth_requestAccounts`. Untuk Chrome Android tanpa provider yang diinjeksi, MetaMask Connect EVM adalah jalur resmi yang dapat membuka aplikasi MetaMask melalui deeplink. Private key tidak pernah masuk ke DApp.
