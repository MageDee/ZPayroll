# 🛡️ ZPayroll — Private Shielded Payroll on Zcash

> Private, borderless payroll powered by Zcash shielded transactions.  
> Salaries stay completely hidden on-chain.

![Testnet](https://img.shields.io/badge/network-testnet-orange)
![Zcash](https://img.shields.io/badge/powered%20by-Zcash-f4b728)
![Node](https://img.shields.io/badge/backend-Node.js-green)
![React](https://img.shields.io/badge/frontend-React-blue)

---

## 🔗 Live Demo

👉 **[zpayroll.vercel.app](https://zpayroll.vercel.app)**

> Running on Zcash testnet — no real funds involved.

---

## The Problem

Traditional crypto payroll is fully transparent — anyone can look up a wallet on a block explorer and see exactly who paid who, how much, and when. This exposes:

- Employee salaries to colleagues and competitors
- Employer treasury movements to the public
- Cross-border workers to financial surveillance

## The Solution

ZPayroll uses Zcash's **shielded transactions** to make payroll completely private on-chain:

- ✅ Employees cannot see each other's salaries
- ✅ Employer treasury movements stay private
- ✅ Cross-border payments with no bank intermediaries
- ✅ Auditable with optional viewing keys for accountants

---

## 🛠️ How It Uses the Zcash Network

### Orchard Shielded Pool (NU5+)
ZPayroll targets the **Orchard protocol**, Zcash's current and most advanced shielded pool, introduced in the NU5 network upgrade. Orchard uses **Halo2 zero-knowledge proofs** — a recursive proof system that requires no trusted setup, making it cryptographically superior to the earlier Sapling protocol.

Every payroll transaction goes through the Orchard pool:

```
Employer Wallet (Orchard)
        ↓
  zk-SNARK proof generated
  (proves validity without revealing amount, sender, or recipient)
        ↓
Shielded transaction broadcast to Zcash testnet via zingo-cli
        ↓
Employee receives ZEC at their unified address (utest1...)
— amount and sender hidden on-chain
```

### Unified Addresses
ZPayroll uses **Unified Addresses** (ZIP-316), the current Zcash address standard. These bundle multiple receiver types into one address string, prefixed `utest1` on testnet. When an employer sends payroll, the protocol automatically routes funds through the Orchard receiver for maximum privacy.

### Unified Full Viewing Keys
Employers receive a **Unified Full Viewing Key** (`uviewtest1...`) at wallet setup. This key grants read-only access to all incoming and outgoing transactions — enough for an accountant to verify payroll records — without any ability to move funds. This is a native Zcash privacy primitive, not an application-layer workaround.

### Wallet Derivation (ZIP-32)
Each employer's Zcash wallet is derived deterministically from their Ed25519 identity keypair using **SHA-256 → ZIP-32 key derivation**. The same keypair always produces the same Zcash wallet — there is no separate seed phrase to manage. The frontend triggers wallet setup via an onboarding check (`/api/wallet/create` or `/api/wallet/restore`), passing the credentials once to generate the persistent session.

### Light Client Protocol
ZPayroll connects to the Zcash testnet via **lightwalletd** — a gRPC-based light client protocol that allows wallet operations without running a full Zcash node. The application uses an environment-configured testnet lightwalletd endpoint (defaulting to `https://testnet.zec.rocks:443`), making the backend infrastructure-free for development.

---

## 🏗️ Architecture

```
Browser (React + Vite)
    │
    │  Ed25519 keypair generated in browser (Web Crypto API)
    │  Private key sent ONCE to backend → session token returned
    │  All subsequent calls use session token only
    │  Roster & local view history stored inside localStorage
    │
    ▼
Node.js Express Backend
    │
    │  Derives Orchard wallet via zingo-cli binary subprocess loops
    │  Computes sha-256(privkey) to feed bip39 mnemonic generation
    │  Issues session token — private key discarded after derivation
    │  Verifies Ed25519 signatures for multi-signature approvals
    │
    ▼
ZingoLib (zingo-cli native release binary target)
    │
    │  ZIP-32 Orchard key derivation via local wallet files
    │  Halo2 zk-SNARK proof generation & cache tracking
    │  Transaction construction, logging, and quicksend dispatch
    │
    ▼
Remote Lightwalletd Endpoint (gRPC server configuration)
    │
    ▼
Zcash Testnet (Orchard shielded pool execution matrix)
```

---

## 🌟 Key Features

### 🔐 Cryptographic Identity
No email. No password. Identity on ZPayroll is an **Ed25519 keypair** generated in the user's browser using the Web Crypto API. The public key is the employer's identity. The private key never leaves the browser permanently — it is used once to derive the Zcash wallet and then discarded server-side, with an isolated session token issued for all subsequent requests.

### 💸 Shielded Payroll
Salary payments are Zcash **Orchard shielded transactions**. The zk-SNARK proof is generated via the `zingo-cli` runtime worker on the backend and broadcast to the testnet. Transaction amounts, sender addresses, and recipient addresses are all hidden on-chain.

### 🔑 Wallet Ownership
Each employer's workspace has its own **unique Orchard wallet** isolated within `/data` by public key prefix parameters. There is no shared platform wallet. The employer's funds are in their wallet — ZPayroll never holds or controls them long-term.

### ✍️ M-of-N Multisig Approval
Workspaces can be configured with an **M-of-N approval policy**. Before payroll executes, M co-signers must independently sign the payroll payload hash with their own Ed25519 keypairs. Signing happens locally in each co-signer's browser — no private key is ever shared or transmitted. The backend verifies each signature against the registered public keys before executing via `zingo-cli`. 

> **Governance Roadmap:** The upgrade path will introduce **FROST threshold signatures** (`frost-rerandomized`), the Zcash Foundation's audited threshold signing library. This replaces the approval layer with true threshold cryptography where the spending key is never assembled by any single party.

### 👁️ Accountant Access via Viewing Keys
Employers can share their **Unified Full Viewing Key** (`uviewtest1...`) with accountants. This key provides complete read-only visibility into all wallet transactions — sufficient for payroll auditing and tax compliance — without any ability to move funds.

### 📋 Full Wallet Transparency (to owner)
Employers see their complete wallet details at setup:
- **Unified Address** (`utest1...`) — for receiving deposits
- **Unified Full Viewing Key** (`uviewtest1...`) — for accountant access
- **24-word BIP-39 seed phrase** — for wallet recovery in any compatible Zcash wallet
- **Birthday height** — testnet block height at wallet creation, for efficient scanning

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite + DM Mono / Bebas Neue |
| **Styling** | Custom responsive theme configuration design system |
| **Auth & Signing** | Ed25519 via Web Crypto API (browser-native) |
| **Backend Engine** | Node.js + Express |
| **Crypto Dependencies** | `bip39` (mnemonic generation) + `crypto` |
| **Zcash Engine** | Native `zingo-cli` executable integration via `execFile` subprocesses |
| **Protocol Layer** | Orchard (NU5+), ZIP-32, ZIP-316, Halo2 |
| **Network Node** | Zcash Testnet via `lightwalletd` gRPC nodes |
| **Roster Storage** | Local workspace cache configuration (`localStorage`) |
| **Multisig Approval** | Ed25519 M-of-N payload signature hooks |
| **Explorer** | [testnet.cipherscan.app](https://testnet.cipherscan.app) |
| **Faucet** | [testnet.zecfaucet.com](https://testnet.zecfaucet.com) |

---

## 📂 Repo Layout

- `backend/` — Express API server (`server.js`), `Dockerfile`, configurations, and a local `/data` directory handling database persistence files (`payroll-history.json`, `workspace-multisig.json`, `pending-multisig-runs.json`).
- `frontend/` — React + Vite single-page application dashboard workspace environment.

---

## 🚀 Running Locally

### Prerequisites
- Node.js 20+
- A compiled copy of `zingo-cli` saved onto your host system

### Backend Setup
1. Navigate to the api directory and fetch runtime packages:
   ```bash
   cd backend
   npm install
   ```
2. Set up your environment indicators inside a `.env` file:
   ```env
   PORT=3001
   ZINGO_BIN="C:\Users\USER\zingolib\target\release\zingo-cli.exe"  # Target path to your executable binary
   LIGHTWALLETD="https://testnet.zec.rocks:443"
   ```
3. Initialize the Express API service:
   ```bash
   node server.js
   ```

#### 🐳 Docker Execution Alternate
```bash
cd backend
docker build -t zpayroll-backend .
docker run -p 3001:3001 -e PORT=3001 zpayroll-backend
```

### Frontend Setup
1. Open a new terminal pane, move to the frontend folder, and install packages:
   ```bash
   cd frontend
   npm install
   ```
2. Configure your local configuration layer pointing to the active backend api port:
   ```bash
   echo "VITE_API_URL=http://localhost:3001" > .env.local
   ```
3. Boot the Vite development environment server:
   ```bash
   npm run dev
   # → http://localhost:5173
   ```

---

## 🔄 User Flow

```
1. Visit ZPayroll dashboard
2. Generate Ed25519 keypair in browser
   → Public key = your identity parameters
   → Private key = transmitted once to compute seed matrix, then immediately discarded
3. Backend spins up zingo-cli to derive your Orchard wallet (utest1 address + uviewtest1 viewing key)
   → You receive your 24-word seed phrase layout and birthday block height
   → Session token issued for all future secure API network transactions
4. Fund your deposit address string using testnet faucet parameters (testnet.zecfaucet.com)
5. Add employees with their utest1 target address indicators
6. Dispatch payroll → shielded Orchard transactions sent via active background workers
   → zk-SNARK proofs are generated, hiding metadata metrics completely on-chain
   → TX ID hashes are securely tracked and viewable on Cipherscan explorer
7. Share viewing key parameters with an accountant for audit tracking access
```

---

## 🗺️ Roadmap

- **FROST Threshold Signatures** — replace Ed25519 M-of-N approval workflows with `frost-rerandomized`, the Zcash Foundation's audited threshold signing library.
- **Mainnet Deployment** — production-ready after completion of an independent security audit code review.
- **Automated Recurring Payroll Cycles** — scheduled worker routines triggering cron execution parameters with a configurable cadence.

---

## 🔧 Troubleshooting

- **404 Server Errors (`Invalid server response`):** Double-check compiler routing metrics. If hosting cross-domain layouts (e.g., frontend on Vercel and api worker on Railway), confirm your build environment matches your target live domain (`VITE_API_URL`).
- **Zingo Subprocess Linkage Failures (`libsqlite3` exceptions):** If execution calls crash on your local Linux host due to missing shared database engine libraries, install the necessary native components manually:
  ```bash
  sudo apt-get update && sudo apt-get install -y libsqlite3-0
  ```

---

## 📄 License

This project is licensed under the MIT License — see the `LICENSE` file for details.

---
*Built for the Zcash Hackathon*
