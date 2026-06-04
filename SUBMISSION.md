# 🛡️ ZPayroll — Hackathon Submission Document

## 📌 Submission Overview

* **Project Name:** ZPayroll
* **Bounty / Track:** Core Privacy / Applications Track
* **Tagline:** Fully private, borderless corporate compensation powered by Zcash Orchard shielded transfers.
* **Live Deployment Platform:** [zpayroll.vercel.app](https://zpayroll.vercel.app)
* **Video Walkthrough / Demo:** [youtu.be/ss6DDuaUMkg](https://youtu.be/ss6DDuaUMkg?si=IXxiOKmuyLKIi4qN)
* **Backend API Base Engine:** [zpayroll-production.up.railway.app](https://zpayroll-production.up.railway.app)
* **Code Repository Context:** [https://github.com/MageDee/ZPayroll](https://github.com/MageDee/ZPayroll)

---

## 💡 Problem Space & Strategic Vision

Traditional cryptocurrency payment architectures operate on fully transparent, public ledgers. When organizations implement mainstream Web3 rails for corporate payroll, sensitive transaction data is exposed on block explorers. This structural transparency causes critical operational vulnerabilities:

* **Internal Compensation Leakage:** Employees can easily audit the wallet chains of peers, exposing organizational salary hierarchies and straining internal operational dynamics.
* **Treasury Visibility:** Public adversaries can track corporate funding addresses, protocol inflows, and overall capital reserves, exposing corporate financial positioning.
* **Surveillance Risks for Global Workers:** Cross-border remote contract workers are subjected to localized on-chain transaction monitoring and potential financial data exploitation.

### The ZPayroll Intervention
ZPayroll abstracts transaction infrastructure away from public tracking spaces. By utilizing advanced zero-knowledge proof cryptography natively supported on the Zcash network, corporate entities can coordinate bulk, multi-destination payroll dispatches without broadcasting identifying sender meta-data, target address locations, or transactional payment thresholds on-chain.

---

## 🛠️ Zcash Network Protocols & Primitives

ZPayroll relies on deep integration with Zcash network parameters rather than basic application-layer masking:

### 1. Orchard Shielded Pool Execution (NU5+)
All payment events process through the **Orchard protocol**, introduced in the NU5 network upgrade. Transactions leverage **Halo2 zero-knowledge proofs (zk-SNARKs)**—a recursive validation system independent of any trusted setup phase. The network validates account states and proofs asynchronously, masking the payment metadata completely on-chain.

### 2. Unified Addresses (ZIP-316)
ZPayroll adopts **Unified Addresses** (prefixed with `utest1...` on the Zcash testnet). This address standard bundles discrete internal receiver components into a single cryptographic string. ZPayroll automatically routes active transaction distribution loops through the internal Orchard receiver mechanism to guarantee the highest possible baseline for transaction privacy.

### 3. Unified Full Viewing Keys (UFVKs)
To reconcile corporate operational privacy with mandatory financial accounting compliance, ZPayroll utilizes native **Unified Full Viewing Keys** (`uviewtest1...`). This allows employers to supply auditors or internal accountants with full read-only visibility into transaction ledger lines without exposing the actual spending authority parameters.

### 4. ZIP-32 Deterministic Wallet Derivation
Workspace security removes the dependency on managing separate platform-side seed phrases. Orchard wallets are derived deterministically from the browser-generated Ed25519 corporate identity keypair via a **SHA-256 ➔ ZIP-32 derivation routine**. The identical key configuration always reconstructs the exact same unique Zcash wallet space.

---

## 🏗️ Technical Architecture & Implementation Metrics

ZPayroll enforces a secure boundary separation by isolating browser identity generation loops from the heavy cryptographic backend execution daemon.

```
Browser Interface (React + Vite)
    │
    │  Ed25519 identity keypair generated via Web Crypto API
    │  Private key transmitted ONCE to backend context
    │  Roster configurations persisted to client localStorage
    │
    ▼
Node.js Express API Layer
    │
    │  Performs SHA-256 ➔ ZIP-32 derivations via zingo-cli hooks
    │  Converts seed vectors into bip39 mnemonics in-memory
    │  Drops private key context immediately; returns x-session-token
    │
    ▼
ZingoLib Daemon Subprocess
    │
    │  Manages isolated workspace state files inside /data
    │  Compiles zero-knowledge statements and sync queues
    │  Triggers batch multi-destination quicksend broadcasts
    │
    ▼
Remote Lightwalletd Endpoint (gRPC testnet.zec.rocks:443)
    │
    ▼
Zcash Testnet Protocol Layer
```

### Stack Breakdown
* **Web Client Core:** React 18 + Vite compilation tooling. Custom light/dark reactive wireframe UI.
* **Cryptographic Identity Hooks:** Native browser Web Crypto API (Ed25519 algorithms).
* **Backend Routing Core:** Node.js + Express API environment.
* **Storage & Persistence:** In-memory context mapping for backend tokens. Relational configurations persist locally to disk via structural state objects:
  * `data/payroll-history.json` — Tracks archived operational run metadata.
  * `data/workspace-multisig.json` — Records assigned multisig policies.
  * `data/pending-multisig-runs.json` — Serves as a staging buffer for unexecuted workflows.
* **Blockchain Integration Daemon:** Subprocess execution loops via standard native `zingo-cli` target binary distributions interacting with remote public `lightwalletd` instances.

---

## 🤝 Accomplishments & Governance Controls

* **Programmatic Batch Dispatches:** Employers structure custom worker teams, inspect synchronized testnet asset metrics, and run bulk payroll routines with one click.
* **Application-Layer M-of-N Multisig Approvals:** Workspaces can enforce multi-layered governance controls. Distribution arrays enter a secure staging queue. Co-signers evaluate active balances and log verification data locally using browser-validated Ed25519 signatures before the backend triggers `zingo-cli` node updates.
* **Zero-Persistence Backend Caching:** Ephemeral private key processing means that critical core spend tokens pass uniquely through memory strings during startup loops and are wiped immediately upon token validation.
* **Exportable Ledger Formats:** Internal data records convert cleanly into portable CSV formats or structured JSON file objects for external processing.

---

## 🗺️ Engineering Roadmap

* **FROST Threshold Cryptography:** Transition the current Ed25519 multi-signature validation structure into an implementation leveraging `frost-rerandomized` (the Zcash Foundation's audited threshold signing library). This eliminates single-point-of-failure key reconstruction by generating mathematical partial signatures across distributed contexts.
* **Automated Recurring Run Cadence:** Integrate crontab orchestration hooks onto the Express daemon framework to allow scheduled payroll dispatches across custom interval bounds.
* **Hardware Security Integration:** Interface client credential inputs with Hardware Security Module (HSM) boundaries to safely manage enterprise spending targets.
* **Employee Compliance Portal:** Launch segmented destination-only tracking frameworks where employees inspect individual payment states by supplying corresponding cryptographic proofs.

---

## ⚠️ Disclaimer

ZPayroll is a hackathon prototype currently configured for the **Zcash testnet** utilizing testnet ZEC assets with zero real-world value. It has not been subjected to a complete independent third-party code review or cryptographic security audit and is not ready for production mainnet orchestration.

---
*Built for the Zcash Hackathon · Powered by Zcash Orchard + ZingoLib*
