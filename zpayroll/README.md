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
  (zk-SNARK proofs generated live)
              ↓
Each employee receives ZEC privately
    to their own Zcash address
```

Zcash's zk-SNARK cryptography proves each transaction is valid without revealing the sender, recipient, or amount on-chain.

---

## Features

- **Employer dashboard** — fund wallet, manage team, run payroll in one click
- **Live wallet balance** — synced directly from Zcash testnet
- **Batch payroll** — send shielded ZEC to the entire team in one run
- **Payroll history** — full record of past runs with transaction IDs
- **Add employees** — onboard team members by Zcash unified address

---

## Built With

- [Zcash](https://z.cash) — Privacy-preserving blockchain
- [WebZjs](https://github.com/ChainSafe/WebZjs) — Browser-native Zcash SDK by ChainSafe
- [React 18](https://react.dev) + [Vite](https://vitejs.dev) — Frontend
- [Express](https://expressjs.com) — Backend API

---

*Built for the Zcash Hackathon*
