# MediChain Backend

Wallet-authenticated Express API + Solidity smart contract for the MediChain decentralized health-record identity platform.

## Structure

```
medichain-backend/
├── contracts/
│   └── AccessControl.sol      # on-chain record hashes, grants, revokes, audit events
├── scripts/
│   └── deploy.js               # deploys the contract to Polygon Amoy testnet
├── hardhat.config.js
└── server/
    ├── index.js                 # Express app entry point
    ├── routes/
    │   ├── auth.js              # wallet-signature login (nonce + verify)
    │   ├── records.js           # upload/fetch encrypted records via IPFS
    │   ├── access.js            # grant/revoke/check access
    │   ├── audit.js             # read on-chain audit trail
    │   └── ai.js                # AI drug/allergy conflict check
    └── services/
        ├── auth.js              # nonce store + JWT session issuing
        ├── ipfs.js               # AES-encrypt + pin/fetch from IPFS (web3.storage)
        ├── contract.js           # ethers.js wrapper around the deployed contract
        └── ai.js                 # Claude API call for safety checks
```

## Setup

### 1. Smart contract

```bash
cd medichain-backend
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv
npx hardhat compile
npx hardhat run scripts/deploy.js --network amoy
```

Copy the compiled ABI so the backend can use it:

```bash
mkdir -p server/abi
cp artifacts/contracts/AccessControl.sol/MediChainAccessControl.json server/abi/
```

Copy the deployed address into `server/.env` as `CONTRACT_ADDRESS`.

### 2. Backend server

```bash
cd server
cp .env.example .env   # fill in RPC URL, contract address, web3.storage token, Anthropic key
npm install
npm run dev
```

Server runs on `http://localhost:4000`.

## Auth flow (wallet-based, no passwords)

1. `POST /api/auth/nonce { address }` → returns a one-time nonce string
2. Frontend asks the wallet (MetaMask/WalletConnect) to sign that nonce
3. `POST /api/auth/login { address, signature }` → verifies the signature and
   returns a JWT
4. All other routes require `Authorization: Bearer <jwt>`

## Core API

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/records` | Upload + encrypt a record, pin to IPFS, anchor hash on-chain |
| GET | `/api/records/mine` | List the logged-in patient's own records |
| GET | `/api/records/:recordId` | Fetch + decrypt a record (integrity-verified) |
| POST | `/api/access/grant` | Grant a provider time-boxed access |
| POST | `/api/access/revoke` | Revoke access early |
| GET | `/api/access/check/:recordId` | Check current access status |
| GET | `/api/audit/:recordId` | Full on-chain audit trail for a record |
| POST | `/api/ai/check-conflicts` | AI drug/allergy conflict check on share |

## Notes for the 24-hour build

- `recordMeta` and `nonces` are in-memory `Map`s for demo speed — swap for
  Postgres/Redis if you have time left.
- The `BACKEND_SIGNER_PRIVATE_KEY` relayer pattern lets the backend pay gas so
  judges don't need testnet funds in their own wallet during the live demo —
  clearly mention this "gasless UX" choice in your pitch, it's a legitimate
  design decision, not a shortcut that undermines decentralization (the
  patient/provider identity is still proven by their own wallet signature).
- `verifyIntegrity` is what your "tamper-proof" demo moment should showcase:
  edit the IPFS ciphertext directly and show the on-chain hash check failing.
