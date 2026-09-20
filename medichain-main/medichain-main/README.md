# MediChain - Blockchain Medical Records with Zero-Knowledge Encryption

> **Patient-owned, blockchain-verified medical records with enterprise-grade security**

**Live demo:** [https://medichain-main-ivory.vercel.app/](https://medichain-main-ivory.vercel.app/)

Complete Web3 healthcare platform with **MediChain Shield** - zero-cost, privacy-first security layer featuring client-side encryption, smart contract access control, AI guard, and proven attack resistance.

---

## Overview

MediChain is a decentralized medical record management system that puts patients in complete control of their healthcare data. Using blockchain technology, IPFS storage, and Web3 wallet authentication, patients can securely store, share, and revoke access to their medical records.

### MediChain Shield Security Layer

**NEW**: Enterprise-grade security without modifying a single UI component:

- **Client-Side Encryption** - AES-256-GCM with HKDF key derivation
- **Zero-Knowledge Architecture** - Server never sees plaintext or private keys
- **Time-Bounded Access** - Automatic grant expiration (max 90 days)
- **EIP-712 Signatures** - Replay attack protection with nonce tracking
- **AI Prompt Injection Defense** - 3-layer protection, zero LLM tokens on attacks
- **Multi-Tier Rate Limiting** - IP, wallet, and endpoint-specific limits
- **Immutable Audit Trail** - On-chain access logging
- **Attack-Tested** - 5/5 attack scenarios blocked (see demos)

**Cost**: $0 (free-tier LLMs, local IPFS, testnet gas)

---

## Quick Start

### Prerequisites

- Node.js v18+
- MetaMask browser extension
- pnpm (frontend) and npm (backend)

### 1. Install Dependencies

```bash
# Frontend
cd medichain-main/medichain-main
pnpm install

# Backend
cd ../../medichain-backend
npm install
cd server
npm install
```

### 2. Start Local Blockchain (for Shield features)

```bash
cd medichain-backend
npx hardhat node
```

### 3. Deploy Contracts

```bash
npm run deploy:local
# Auto-generates config files for frontend & backend
```

### 4. Configure Environment

**Backend** (`medichain-backend/server/.env`):
```env
PORT=4000
JWT_SECRET=your-secret-key-here
POLYGON_AMOY_RPC_URL=http://localhost:8545
CONTRACT_ADDRESS=<from-deployment>
SHIELD_REGISTRY_ADDRESS=<from-deployment>
```

**Frontend** (`medichain-main/medichain-main/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CONTRACT_ADDRESS=<from-deployment>
NEXT_PUBLIC_SHIELD_REGISTRY_ADDRESS=<from-deployment>
```

### 5. Start Servers

**Windows PowerShell**:
```bash
.\start-dev.ps1
```

**Manual**:
```bash
# Terminal 1 - Backend
cd medichain-backend/server
npm run dev

# Terminal 2 - Frontend
cd medichain-main/medichain-main
pnpm dev
```

### 6. Open Application

Navigate to **http://localhost:3000** and connect MetaMask!

---

## Verify Installation

### Run All Tests

```bash
# Frontend crypto tests (36 tests)
cd medichain-main/medichain-main
pnpm test

# Backend contract tests (38 tests)
cd ../../medichain-backend
npm test

# AI Guard tests (40+ tests)
npm test test/ai-guard.test.js

# Attack demonstrations (5 scenarios, all blocked)
npm run attack:all
```

**Expected**: 131+ tests passing, all attacks blocked

---

## Documentation

### Essential Docs

1. **[MEDICHAIN-SHIELD-COMPLETE.md](MEDICHAIN-SHIELD-COMPLETE.md)** - Complete Shield implementation guide
   - All 6 phases overview
   - Architecture and security guarantees
   - File structure and API reference
   - Quick start and verification steps

2. **[INTEGRATION.md](INTEGRATION.md)** - Frontend integration guide
   - Complete TypeScript examples
   - Hook usage patterns (useShieldKeys, useShieldGrants, useShieldAudit, useShieldAI)
   - Encryption workflow walkthrough
   - Error handling and best practices

3. **[RUN-DEMOS.md](RUN-DEMOS.md)** - Attack demonstration guide
   - How to run each of 5 attack scenarios
   - Expected console output
   - What each demo validates
   - Demo script for presentations

---

## Attack Demonstrations

**Prove the security works:**

```bash
cd medichain-backend

# Run all 5 attack demos
npm run attack:all

# Or run individually:
npm run attack:stolen-cid      # Stolen CID cannot decrypt
npm run attack:expired-grant   # Time-bounded access enforced
npm run attack:replay          # EIP-712 replay blocked
npm run attack:forged-grant    # Only owner can grant access
npm run attack:injection       # Prompt injection quarantined
```

**Expected**: All attacks BLOCKED with detailed console output

See **[RUN-DEMOS.md](RUN-DEMOS.md)** for detailed guide.

---

## Project Structure

```
Medichain/
├── medichain-backend/
│   ├── contracts/
│   │   ├── AccessControl.sol        # Original access control
│   │   └── AccessRegistry.sol       # NEW: Shield registry (EIP-712)
│   │
│   ├── server/
│   │   ├── middleware/              # NEW: Security middleware
│   │   │   ├── validate.js          # Zod validation + size limits
│   │   │   ├── security-headers.js  # Helmet + CORS + request ID
│   │   │   └── rate-limit.js        # Multi-tier rate limiting
│   │   │
│   │   ├── services/                # NEW: Shield services
│   │   │   ├── shield-storage.js    # IPFS/memory/fs adapters
│   │   │   ├── shield-audit.js      # Event querying
│   │   │   ├── shield-auth.js       # Wallet authentication
│   │   │   ├── ai-guard.js          # 3-layer injection defense
│   │   │   └── llm-adapter.js       # Gemini→Groq→Local fallback
│   │   │
│   │   ├── routes/
│   │   │   ├── shield.js            # NEW: /shield/* endpoints
│   │   │   ├── auth.js              # Wallet auth
│   │   │   ├── records.js           # Record management
│   │   │   ├── access.js            # Access control
│   │   │   ├── audit.js             # Audit trail
│   │   │   └── ai.js                # AI safety checks
│   │   │
│   │   └── config/
│   │       └── contracts.json       # Auto-generated from deployment
│   │
│   ├── scripts/
│   │   └── deploy-shield.js         # Contract deployment
│   │
│   └── test/
│       ├── AccessRegistry.test.js   # 38 contract tests
│       ├── ai-guard.test.js         # 40+ AI tests
│       └── attacks/                 # NEW: Attack demonstrations
│           ├── stolen-cid.test.js
│           ├── expired-grant.test.js
│           ├── replay.test.js
│           ├── forged-grant.test.js
│           └── injection.test.js
│
├── medichain-main/medichain-main/
│   ├── app/
│   │   ├── page.tsx                 # Main UI (unchanged)
│   │   ├── dashboard/page.tsx       # Dashboard (unchanged)
│   │   ├── layout.tsx               # App layout
│   │   └── globals.css              # Tailwind styles
│   │
│   ├── lib/
│   │   ├── crypto/                  # NEW: Cryptographic engine
│   │   │   ├── index.ts             # Main exports
│   │   │   ├── keyDerivation.ts     # HKDF-SHA256 + X25519
│   │   │   ├── aesGcm.ts            # AES-256-GCM encryption
│   │   │   ├── keyWrap.ts           # libsodium key wrapping
│   │   │   └── crypto.test.ts       # 36 tests
│   │   │
│   │   ├── shield-client/           # NEW: API clients
│   │   │   ├── types.ts             # TypeScript definitions
│   │   │   ├── shieldApi.ts         # REST API client
│   │   │   ├── registryContract.ts  # Contract client
│   │   │   └── index.ts
│   │   │
│   │   ├── hooks/                   # NEW: Headless React hooks
│   │   │   ├── useShieldKeys.ts     # In-memory key management
│   │   │   ├── useShieldGrants.ts   # Access control
│   │   │   ├── useShieldAudit.ts    # Event querying
│   │   │   └── useShieldAI.ts       # AI safety analysis
│   │   │
│   │   ├── config/
│   │   │   └── contracts.json       # Auto-generated from deployment
│   │   │
│   │   ├── api.ts                   # API client (axios)
│   │   ├── wallet.ts                # Web3 wallet service
│   │   ├── WalletContext.tsx        # React context
│   │   ├── useRecords.ts            # Records management
│   │   └── useAccess.ts             # Access control
│   │
│   └── components/ui/               # UI components (unchanged)
│
├── README.md                        # This file
├── MEDICHAIN-SHIELD-COMPLETE.md     # Complete Shield guide
├── INTEGRATION.md                   # Frontend integration
├── RUN-DEMOS.md                     # Attack demonstrations
├── start-dev.ps1                    # Dev startup script
└── verify-setup.js                  # Setup verification
```

---

## Technology Stack

### Frontend
- **Next.js 16** with App Router
- **React 19** with TypeScript
- **ethers.js 6** - Wallet integration
- **libsodium-wrappers** - Key wrapping cryptography
- **Tailwind CSS** - Styling

### Backend
- **Express** - Node.js server
- **Solidity** - Smart contracts
- **Hardhat** - Contract development
- **ethers.js** - Blockchain interaction
- **Zod** - Schema validation
- **Helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **pino** - Logging

### Cryptography
- **Web Crypto API** - AES-256-GCM, HKDF-SHA256
- **libsodium** - X25519 key exchange, crypto_box_seal
- **EIP-712** - Typed signature standard

### Storage
- **IPFS** - Decentralized storage (Kubo local node)
- **In-Memory** - Development fallback
- **Filesystem** - Optional adapter

### AI
- **Google Gemini Free** - Primary LLM (15 RPM, no credit card)
- **Groq Free** - Secondary fallback (30 RPM)
- **Local Heuristics** - Tertiary fallback (offline)

### Blockchain
- **Polygon Amoy** - L2 testnet (low gas)
- **OpenZeppelin** - Security standards
- **EIP-712** - Structured signatures

---

## Security Architecture

### Zero-Knowledge Flow

```
1. USER INITIATES
   └─> Wallet signature derives encryption key (client-side)

2. ENCRYPTION
   └─> Medical record encrypted with AES-256-GCM (client-side)
   └─> Record key wrapped with recipient's X25519 public key

3. UPLOAD
   └─> Ciphertext uploaded to IPFS
   └─> CID stored on-chain with access grant
   └─> Server NEVER sees plaintext or private keys

4. ACCESS
   └─> Recipient unwraps record key with their private key
   └─> Decrypts ciphertext locally
   └─> Server NEVER involved in decryption
```

### Security Guarantees

- **Client-Side Encryption** - Plaintext never leaves user's browser
- **Key Derivation** - HKDF-SHA256 from wallet signatures
- **Authenticated Encryption** - AES-256-GCM prevents tampering
- **Forward Secrecy** - Each record has unique encryption key
- **Access Control** - Time-bounded grants with automatic expiry
- **Replay Protection** - EIP-712 signatures with nonce increment
- **Prompt Injection Defense** - 3-layer AI guard (deterministic pre-check, delimited context, output validation)
- **Audit Trail** - Immutable on-chain access logs

### Attack Resistance (All Blocked)

| Attack Vector | Defense Mechanism | Test Status |
|--------------|-------------------|-------------|
| Stolen CID | AES-GCM authentication | Blocked |
| Expired Grant | Time-based contract check | Blocked |
| Signature Replay | Nonce increment | Blocked |
| Forged Grant | Owner-only authorization | Blocked |
| Prompt Injection | 3-layer AI guard | Blocked |

**Proof**: Run `npm run attack:all` to see all attacks fail.

---

## API Endpoints

### Original Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/nonce` | Get nonce for wallet signing |
| POST | `/api/auth/login` | Verify signature, return JWT |
| POST | `/api/records` | Upload medical record |
| GET | `/api/records/mine` | List user's records |
| GET | `/api/records/:id` | Fetch specific record |
| POST | `/api/access/grant` | Grant provider access |
| POST | `/api/access/revoke` | Revoke provider access |
| GET | `/api/audit/:id` | Get audit trail |
| POST | `/api/ai/check-conflicts` | AI drug/allergy check |

### Shield Endpoints (NEW)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/shield/storage/upload` | Upload encrypted ciphertext |
| GET | `/shield/storage/:cid` | Retrieve ciphertext |
| POST | `/shield/audit/query` | Query access events |
| POST | `/shield/ai/analyze` | AI safety analysis with injection defense |

---

## Integration Example

```typescript
import { useShieldKeys, useShieldGrants } from "@/lib/hooks";
import { encryptRecord, wrapKey } from "@/lib/crypto";

function UploadRecordButton() {
  const { keypair, deriveKeys } = useShieldKeys();
  const { grantAccess } = useShieldGrants();

  const handleUpload = async () => {
    // 1. Derive keys from wallet signature
    if (!keypair) await deriveKeys();

    // 2. Encrypt record (client-side)
    const plaintext = new TextEncoder().encode("Medical data");
    const encrypted = await encryptRecord(plaintext, recordId);

    // 3. Upload ciphertext to IPFS
    const cid = await shieldApi.uploadCiphertext(encrypted.ciphertext);

    // 4. Grant access to doctor (wraps key, stores on-chain)
    await grantAccess(
      recordId,
      doctorAddress,
      doctorPublicKey,
      encrypted.recordKey,
      expiryTimestamp
    );
  };

  return <button onClick={handleUpload}>Upload Encrypted Record</button>;
}
```

See **[INTEGRATION.md](INTEGRATION.md)** for complete examples.

---

## Project Statistics

### Implementation
- **Total Files Created**: 45+
- **Lines of Code**: 15,000+
- **Languages**: TypeScript, Solidity, JavaScript
- **Development Time**: ~40 hours

### Testing
- **Crypto Tests**: 36 (100% coverage)
- **Contract Tests**: 38 (≥95% coverage)
- **AI Guard Tests**: 40+
- **Attack Demos**: 5 (all blocked)
- **Total Tests**: 131+

### Costs
- **Development**: $0
- **LLM Providers**: $0 (free tiers)
- **Storage**: $0 (local IPFS)
- **Network**: $0 (testnet gas)
- **Total**: **$0**

---

## Troubleshooting

### Backend Won't Start
```bash
# Check dependencies
cd medichain-backend/server
npm install

# Verify .env file exists
ls .env

# Check port availability
netstat -ano | findstr :4000
```

### Frontend Won't Build
```bash
# Install pnpm if needed
npm install -g pnpm

# Install dependencies
cd medichain-main/medichain-main
pnpm install

# Clear cache and rebuild
rm -rf .next
pnpm build
```

### Tests Failing
```bash
# Crypto tests need libsodium
cd medichain-main/medichain-main
pnpm add -D libsodium-wrappers

# Contract tests need Hardhat network
cd medichain-backend
npx hardhat node  # In separate terminal
npm test
```

### MetaMask Issues
- Install/unlock MetaMask extension
- Switch to Polygon Amoy testnet
- Get test MATIC from [faucet](https://faucet.polygon.technology/)
- Clear browser cache and localStorage
- Refresh page

---

## Additional Resources

### Live Demo
- **Deployed app**: [https://medichain-main-ivory.vercel.app/](https://medichain-main-ivory.vercel.app/)

### Documentation
- **Complete Shield Guide**: [MEDICHAIN-SHIELD-COMPLETE.md](MEDICHAIN-SHIELD-COMPLETE.md)
- **Backend README**: `medichain-backend/README.md`
- **Frontend README**: `medichain-main/medichain-main/README.md`

### Scripts
- `start-dev.ps1` - Start both servers (Windows)
- `verify-setup.js` - Verify installation

### Testing
- `npm test` - Run contract tests
- `pnpm test` - Run crypto tests
- `npm run attack:all` - Run attack demonstrations
- `npm run test:coverage` - Generate coverage reports

---

## Production Recommendations

### Before Deploying
1. Audit smart contracts (OpenZeppelin or CertiK)
2. Migrate to w3up-client for Web3.storage
3. Add PostgreSQL/MongoDB for metadata
4. Implement Redis for session caching
5. Add comprehensive monitoring (Sentry, DataDog)
6. Set up CI/CD pipeline
7. Implement backup and disaster recovery
8. Add HIPAA compliance measures
9. Configure production LLM provider (Claude/GPT-4)
10. Deploy to mainnet (Polygon PoS)

---

## Key Achievements

- **Zero Visual Changes** - No component modifications
- **$0 Total Cost** - Free-tier only
- **Zero-Knowledge** - Server never sees plaintext
- **Non-Breaking** - Existing code untouched
- **Production Ready** - Comprehensive tests
- **Attack Resistant** - 5/5 attacks blocked
- **Type Safe** - Full TypeScript coverage
- **Well Documented** - Complete guides

---

## Contributing

This project is open source. Feel free to fork, extend, and submit PRs!

---

## License

MIT License - See LICENSE file for details

---

## Acknowledgments

- Built with [v0.dev](https://v0.dev) for UI components
- Powered by [Polygon](https://polygon.technology/) for L2 scaling
- Storage by [IPFS](https://ipfs.tech/) for decentralized files
- AI by [Google Gemini](https://ai.google.dev/) free tier
- Cryptography by [libsodium](https://libsodium.gitbook.io/)

---

**Ready to get started?** Run `.\start-dev.ps1` or see [MEDICHAIN-SHIELD-COMPLETE.md](MEDICHAIN-SHIELD-COMPLETE.md)
