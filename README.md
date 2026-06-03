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

## How It Works

```
Employer deposits ZEC into platform wallet
              ↓
        ZPayroll dashboard
              ↓
  Shielded transactions dispatched
  (zk-SNARK proofs generated live via zingo-cli)
              ↓
Each employee receives ZEC privately
    to their own Zcash address
```

Zcash's zk-SNARK cryptography proves each transaction is valid without revealing the sender, recipient, or amount on-chain.

---

## Features

- **Employer Dashboard** — Fund wallet, manage team, and run payroll in one click with real-time balance metrics.
- **Deterministic Wallet Management** — Automatically derive or restore your ZIP-32 Orchard testnet wallet using browser-generated Ed25519 identities.
- **Multisig Workflow Protected** — Configure an $M$-of-$N$ threshold setup to ensure programmatic corporate expenses require distributed signer confirmations.
- **Batch Payroll & Queueing** — Dispatch shielded `quicksend` arrays across the entire active roster or route them to approval buffers.
- **Audit Portability** — Review local encrypted payroll history entries or export analytical records directly as structured CSV or JSON files.

---

## 🛠️ Built With

- **[Zcash Ecosystem](https://z.cash/)** — Privacy-preserving blockchain architecture providing destination, amount, and memo protection.
- **[Zingo-CLI](https://github.com/zingolabs/zingolib)** — Asynchronous lightwalletd binary client orchestration layer executing high-performance node synchronizations and transactional proof configurations.
- **[Node.js Engine](https://nodejs.org/) & [Express](https://expressjs.com/)** — Lightweight backend API runtime orchestrating runtime subprocess pipes, cryptographic seed generation (`bip39`), and disk data persistence.
- **[React 18](https://react.dev/) & [Vite Tooling Stack](https://vitejs.dev/)** — Scalable modern interface bundle engine delivering client-side signature validations and dynamic interactive dashboard states.

---

## 📂 Repo Layout

- `backend/` — Express API server (`server.js`), `Dockerfile`, runtime helper configurations, and local JSON persistence directory (`data/`).
- `frontend/` — React + Vite single-page application dashboard engine and theme contexts.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (Node 20 recommended, minimum 16+)
- npm or pnpm
- A compiled copy of `zingo-cli` accessible on the host machine
- Docker (Optional, for containerized backend deployment)

### 📦 Backend Setup (Local)

1. Navigate to the backend directory, install packages, and initialize your workspace:
   ```bash
   cd backend
   npm install
   ```

2. Configure your environment metrics. Create a `.env` file or provide system-level environmental markers:
   ```env
   PORT=3001
   ZINGO_BIN="C:\Users\USER\zingolib\target\release\zingo-cli.exe"  # Absolute path to your compiled binary
   LIGHTWALLETD="https://testnet.zec.rocks:443"                            # Defaults to testnet.zec.rocks:443
   ```

3. Initialize the Express API service:
   ```bash
   node server.js
   ```

#### 🐳 Docker Containerized Execution
To insulate the environment along with necessary shared target binary systems, build and boot locally using Docker:
```bash
cd backend
docker build -t zpayroll-backend .
docker run -p 3001:3001 -e PORT=3001 zpayroll-backend
```

### 🖥️ Frontend Setup (Local)

1. Navigate to the frontend workspace context and mount runtime package files:
   ```bash
   cd frontend
   npm install
   ```

2. Assign build targets to direct compilation traffic mapping schemas. Create a local environment layer:
   ```bash
   echo "VITE_API_URL=http://localhost:3001" > .env.local
   ```

3. Spin up the hot-reloading development client service pipeline:
   ```bash
   npm run dev
   ```

4. Assemble high-performance asset minifications optimized for production hosting sites (e.g., Vercel, Netlify):
   ```bash
   npm run build
   ```

---

## 💡 Environment Configuration References

| Parameter | Application Layer | Context Description |
| :--- | :--- | :--- |
| `PORT` | Backend Runtime | Evaluates what interface port bounds to deploy on. Defaults to `3001`. |
| `ZINGO_BIN` | Backend System | Explicit system location targets indicating where the compiled `zingo-cli` host utility lives. |
| `LIGHTWALLETD` | Backend Crypto | Targeted address maps identifying remote endpoint indices for Zcash state updates. |
| `VITE_API_URL` | Frontend Compile | Build-time URL base (e.g., `https://zpayroll-api.railway.app`). Directs client fetching routines. |
| `FRONTEND_URL` | Backend Security | Evaluates incoming origin paths to process strict security authorization checks (CORS targets). |

---

## 💡 Usage Notes

### 🔐 Cryptographic Session & Wallet Derivation Model
- **Zero-Persistence Keys:** The backend engine operates using transient validation constructs. It does **not** write or persist your Ed25519 private keys or underlying seed parameters to disk.
- **Derivation Routing:** During dashboard onboarding (`/api/wallet/create` or `/api/wallet/restore`), an explicit instance of your private key is passed to derive the matching 24-word ZIP-32 Orchard key layout structure. The server then drops the key information and replaces the access state with an active token tracker (`x-session-token`) valid for **8 hours**.

### 🤝 Multi-Signature Workspace Approvals
- Protect organizational treasuries by implementing an active split approval scheme under the **Settings** layout layer.
- Submitting a payroll payload inside a multisig-protected layout queues distributions safely within `pending-multisig-runs.json`. Co-signers verify balances and supply authentication stamps locally using browser-validated Ed25519 configurations before `zingo-cli` registers updates or dispatches on-chain transfers.

---

## 🔧 Troubleshooting

- **404 Exception Logs (`Invalid server response`):** Double-check compiler setup indicators. If your front-end layer relies on structural static systems like Vercel while your application programming pipelines map back to separate host backends, confirm that your build metrics contain the accurate `VITE_API_URL` address string.
- **Subprocess Failures / Shared Object Linkages:** If your local machine triggers terminal runtime crashes mapping back to missing `libsqlite3.so.0` artifacts while calling automated steps, verify that your active workspace context supplies standard SQL tools:
  ```bash
  sudo apt-get update && sudo apt-get install -y libsqlite3-0
  ```

---

## 📄 License

This project is licensed under the MIT License — see the `LICENSE` file for details.

---
*Built for the Zcash Hackathon*
