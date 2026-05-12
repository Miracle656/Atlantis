# 🔱 ATLANTIS

**The Premier dApp Discovery Platform on Sui**

ATLANTIS is a decentralized application (dApp) discovery platform built on the Sui blockchain. It provides a curated, community-driven directory of the best dApps in the Sui ecosystem, featuring a distinct Neo-Brutalist design aesthetic. https://atlantisonsui.wal.app/

![ATLANTIS Banner](src/assets/Group%2027.png)

The ATLANTIS repository is a production-oriented decentralized dApp discovery platform built on the Sui blockchain. It provides a curated, community-driven directory of dApps with on-chain reviews, decentralized comment storage, SuiNS integration, and an iframe-based mini-app experience for in-place dApp interaction.

This README is written for engineers joining the project. It describes architecture, design decisions, setup, usage, testing, CI expectations, troubleshooting, contribution guidelines, and a roadmap.

---

Table of contents
- Project overview
- Architecture & key modules
- Tech stack
- Design decisions, patterns & trade-offs
- Prerequisites
- Local setup & environment configuration
- Development workflows and useful scripts
- Usage examples (UI flows & sample Sui interactions)
- Testing strategy & CI/CD
- Troubleshooting & common pitfalls
- Contributing & branching strategy
- Roadmap / Future work
- License

---

## Project overview

Purpose
- Provide an index and discovery experience for dApps on Sui.
- Enable verifiable, on-chain reviews: reviews are provably associated with users who interacted with a dApp contract.
- Store comment bodies in decentralized storage (Walrus) while keeping references on-chain.
- Let users open dApps inline in a sandboxed mini-app iframe for frictionless exploration.

Primary use cases
- End users browsing curated lists and rankings of Sui dApps (DeFi, NFT, Games, Social).
- Project teams submitting and maintaining dApp meta-data and landing pages.
- Community-driven verification and moderation of reviews and comments.

Non-goals
- A full decentralized identity or reputation system (beyond SuiNS and transaction-based verification).
- Acting as an on-chain execution layer — ATLANTIS is primarily an index & UI + lightweight on-chain references.

---

## Architecture & key modules

High level
- Frontend: React + Vite + TypeScript app serving the UI and client logic.
- On-chain logic: Move smart contracts on Sui (Registry, Reviews, Comments reference objects).
- Decentralized storage: Walrus for comment/review bodies and large blobs.
- Identity: SuiNS for friendly names/avatars.
- Wallet integration: @mysten/dapp-kit (Sui wallet connectors).
- Deployment: Static site hosting (e.g., Vercel, Netlify, or S3 + CDN) for the frontend; Move packages deployed to Sui network (testnet/mainnet).

Core frontend modules (src/)
- src/components — UI atoms and composed components (search, ranking cards, review widget, mini-app iframe).
- src/pages — route-level views (Home, Category, dApp detail, Submit).
- src/services — Sui RPC helpers, Walrus client, contract call wrappers.
- src/constants.ts — runtime constants and network/package IDs.
- src/state — application state (React Contexts / Zustand / Redux depending on codebase), wallet state.
- src/utils — small helpers (sanitizers, hashing, formatters).

On-chain modules (Move contracts)
- Registry — register/update dApp metadata (name, url, categories).
- Reviews — create review references and verification flags (on-chain pointer + minimal metadata).
- Comments — reference Walrus blob hashes for comment bodies and thread metadata.

Data flow
1. User interacts with UI and connects wallet.
2. For a review/comment:
   - Body (rich text) is uploaded to Walrus → returns blob hash / URL.
   - Frontend calls Move transaction with reference (blob hash) and minimal metadata (rating, dApp id).
   - Sui transactions are used to verify interaction provenance (e.g., did the signer call the dApp contract?).
3. UI displays aggregated rankings using on-chain metrics + off-chain telemetry (if available).

---

## Tech stack

- Frontend
  - React + Vite
  - TypeScript (strict)
  - Tailwind CSS with a Neo-Brutalist theme
  - @mysten/dapp-kit for Sui wallet integrations
- Blockchain
  - Sui (Move smart contracts)
  - Sui JSON-RPC (sui.js) for queries and transaction submission
- Storage & Identity
  - Walrus for storing comment content
  - SuiNS for names/avatars
- Tooling
  - Node.js v18+
  - npm or yarn
  - Bundler: Vite
  - Tests: Vitest / Jest (depending on project config)
  - Lint/format: ESLint + Prettier
- CI/CD (recommended)
  - GitHub Actions: lint, type-check, unit tests, build, and deploy

---

## Important design decisions, patterns & trade-offs

1. On-chain references + off-chain content (Walrus)
   - Decision: Store large/unbounded text on Walrus; store immutable references (hash/URI) on-chain.
   - Trade-off: cheaper on-chain storage and easier rich content vs. reliance on Walrus availability and content discoverability.
   - Mitigation: Validate blobs on fetch (hash verification), keep metadata on-chain for discoverability.

2. Verification of reviews using transaction provenance
   - Decision: Use Sui transaction receipts to check whether a reviewer has interacted with the target dApp contract.
   - Trade-off: False negatives if interaction was off-chain or via other accounts. Simpler and on-chain verifiable method chosen for integrity.
   - Assumption: Most meaningful verifications come from recent on-chain interactions.

3. Mini-App via iframe
   - Decision: Use an iframe sandbox to host dApps inside ATLANTIS for frictionless usage.
   - Trade-off: Some dApps may restrict embedding (X-Frame-Options) or rely on parent window for web3 handshake.
   - Mitigation: Provide an external open-in-new-tab button and negotiate a postMessage bridge for wallet connection where possible.

4. Client-first application
   - Decision: Frontend is a single-page app communicating with Sui RPC and Walrus directly.
   - Trade-off: Serverless architecture simplifies deployment but shifts trust and complexity to the client.
   - Optional future: Add an indexing backend for richer analytics and security checks.

5. Security
   - Always sanitize Walrus content on render.
   - Rate-limit and sign requests where applicable.
   - Do not expose private keys — rely on wallet providers.

---

## Prerequisites

- Node.js >= 18.x
- npm >= 9.x or yarn >= 1.22
- A Sui wallet (Sui Wallet extension, Ethos Wallet, or compatible)
- Access to a Sui RPC endpoint (testnet/mainnet)
- Optional: Walrus account/API key (if Walrus requires authentication)

---

## Environment configuration

Create a `.env` or `.env.local` at the project root (do not commit secrets).

Common variables (add to `.env.local`):
```env
VITE_NETWORK=testnet               # 'testnet' | 'mainnet'
VITE_SUI_RPC=https://fullnode.testnet.sui.io:443
VITE_PACKAGE_ID=0x...              # Deployed Move package id for Reviews/Registry
VITE_REGISTRY_ID=0x...             # Shared registry object id
VITE_WALRUS_BASE=https://walrus.example/api
VITE_WALRUS_KEY=your-walrus-key    # Optional, if Walrus requires auth
VITE_APP_TITLE="ATLANTIS"
```

Notes:
- The frontend accesses these with `import.meta.env.VITE_*`.
- `src/constants.ts` is used to provide defaults; ensure it doesn't hard-code secrets.

---

## Local setup & installation

1. Clone repository
```bash
git clone https://github.com/Miracle656/mamiwater.git
cd mamiwater
```

2. Install dependencies
```bash
npm ci
# or
yarn install --frozen-lockfile
```

3. Add environment variables
- Copy `.env.example` → `.env.local` and update values.

4. Run development server
```bash
npm run dev
# or
yarn dev
```
Visit http://localhost:5173 (default Vite port) — the exact port is printed by Vite.

5. Build for production
```bash
npm run build
npm run preview   # preview the production build locally
```

---

## Useful npm scripts

These names assume the project `package.json` defines them; if not, add equivalents.

- Start / dev
  - npm run dev — Start dev server (Vite)
- Build & preview
  - npm run build — Build production assets
  - npm run preview — Preview built assets locally
- Quality gates
  - npm run lint — ESLint
  - npm run format — Prettier formatting
  - npm run typecheck — TypeScript type check (tsc --noEmit)
- Tests
  - npm run test — Run unit tests (Vitest/Jest)
  - npm run test:watch — Run tests in watch mode
- CI helpers
  - npm run ci — Run lint, typecheck, tests, and build

Example package.json scripts (reference):
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint 'src/**/*.{ts,tsx}'",
  "format": "prettier --write 'src/**/*.{ts,tsx,md,json}'",
  "typecheck": "tsc --noEmit",
  "test": "vitest"
}
```

---

## Usage examples

1) Basic UI flow (manual)
- Open app in browser
- Connect wallet (click "Connect Wallet")
- Browse categories or search for a dApp
- Open dApp detail → open Mini-App (iframe) or open in new tab
- To leave a review:
  - Write rich text in editor → Upload content to Walrus → Get back blob hash
  - Submit a transaction calling Reviews.create_review with { dapp_id, rating, walrus_hash }

2) Example: Upload comment to Walrus (pseudo-HTTP)
```bash
curl -X POST "${VITE_WALRUS_BASE}/blobs" \
  -H "Authorization: Bearer ${VITE_WALRUS_KEY}" \
  -F "file=@./comment.json" \
  -F "meta={\"contentType\":\"application/json\"}"
# Response:
# { "hash": "sha256:...", "url": "https://walrus.../blobs/sha256:..." }
```

3) Example: Submit review transaction (pseudo-code with @mysten/sui.js)
```ts
import { JsonRpcProvider, RawSigner } from "@mysten/sui.js";
import { connectWallet } from "@mysten/dapp-kit"; // or your wallet connector

const provider = new JsonRpcProvider({ fullnode: import.meta.env.VITE_SUI_RPC });
const wallet = await connectWallet(); // wallet provides signer
const signer = wallet.getSigner(); // pseudocode

const tx = {
  packageObjectId: import.meta.env.VITE_PACKAGE_ID,
  module: "reviews",
  function: "create_review",
  typeArguments: [],
  arguments: [
    REGISTRY_ID,      // registry object id
    dappObjectId,     // target dApp id in registry
    walrusBlobHash,   // hash returned from Walrus
    rating            // numeric rating
  ],
  gasBudget: 1000
};

const result = await signer.executeMoveCall(tx);
// parse result for success and tx digest
```

Note: adapt to your wallet / provider implementation. The project may expose wrapper helpers at `src/services/sui.ts`.

---

## Testing strategy

Goals
- Fast, isolated unit tests for UI and utilities
- Integration tests for Sui RPC interactions using testnet / emulator
- End-to-end (E2E) to validate critical flows (connect wallet, create review) using Playwright or Cypress against a test/dev environment

Recommendations
- Unit tests: Vitest + React Testing Library
- Integration tests: Use local Sui test environment or Sui testnet; stub / mock network calls with nock/msw for CI
- E2E tests: Playwright with a seeded test wallet and controllable testnet account

Common commands
```bash
# unit tests
npm run test

# run vitest in watch
npm run test -- --watch

# run e2e (example)
npx playwright test
```

Quality gates for PRs
- Lint passes
- Type-check passes
- Unit tests pass (minimum coverage threshold configured)
- Build succeeds
- Optional: run integration smoke tests against a testnet fixture

CI example (GitHub Actions)
- Steps:
  1. Checkout
  2. Install Node
  3. npm ci
  4. npm run lint
  5. npm run typecheck
  6. npm run test -- --coverage
  7. npm run build
  8. On main: deploy site (Vercel, Netlify, or S3/CDN)

---

## Troubleshooting & common pitfalls

- Wallet does not connect
  - Ensure wallet extension is unlocked and supports the configured network (testnet/mainnet).
  - Check browser console for connection errors and permissions.
- Transaction fails with "gas budget" or "insufficient gas"
  - Increase gasBudget in transactions or use gas estimation utilities.
- Walrus upload failing or CORS error
  - Ensure VITE_WALRUS_BASE is correct and that the Walrus CORS configuration allows requests from your origin.
  - If auth is required, confirm VITE_WALRUS_KEY is set.
- Iframe refuses to load a dApp
  - Check X-Frame-Options on target site; if blocked, present “Open in new tab” fallback.
- Incorrect PACKAGE_ID / REGISTRY_ID
  - Double-check values in `.env.local` and `src/constants.ts`. Mismatched IDs result in Move call failures.
- TypeScript errors in CI but not locally
  - Ensure CI Node and npm versions match local environment. Run `npm ci` to match lockfile.

Debugging tips
- Use Sui Explorer and fullnode RPC to inspect transaction digests and events.
- Add debug logging around walrus upload response and post-upload hash verification.
- During development, stub out walrus and use local Sui devnet for faster iteration.

---

## Security & best practices

- Never commit private keys or walrus API keys to the repo.
- Sanitize user-generated content (Walrus blobs) before rendering (strip scripts, sanitize HTML).
- Verify uploaded Walrus blobs by hash when retrieving.
- Rate-limit sensitive requests (e.g., meta operations) or require captcha for unauthenticated flows.
- Monitor on-chain interactions for suspicious behavior and provide manual moderation tools.

---

## Contributing

Follow these rules to make contributions productive.

- Branching / PR strategy
  - Use trunk-based workflow with short-lived branches:
    - feature/<ticket>-short-description
    - fix/<ticket>-short-description
    - chore/<description>
  - PRs:
    - Target: `develop` for feature work, `main` only for release merges (or use main directly if you prefer feature branches into main).
    - Include a concise description, screenshots (UI changes), and how to test.
    - Link to any relevant issue/ticket.
  - Reviews:
    - Require at least one reviewer + passing CI for merge.
    - Enforce linear history (rebase and merge or squash, depending on team preference).

- Commit messages
  - Follow Conventional Commits:
    - feat: add user profile
    - fix: correct tx gas estimation
    - chore: bump deps
  - Keep messages descriptive and reference ticket numbers if applicable.

- Coding conventions
  - TypeScript: strict typing; prefer interface over type for exported shapes where appropriate.
  - React: functional components + hooks. Keep components small and testable.
  - Styling: Tailwind utility classes; avoid CSS-in-JS unless necessary.
  - Tests: prefer unit tests for logic, component tests for rendering and interaction, and E2E for integration flows.

- Pull Request checklist
  - [ ] Lint and typecheck pass
  - [ ] Unit tests updated/added
  - [ ] Documentation updated (if surface APIs or behaviors changed)
  - [ ] No secrets in commits

- How to propose changes
  - Open an issue describing the change or bug.
  - For non-trivial changes, create a design proposal (short ADR — architecture decision record) describing alternatives and rationale.

---

## Roadmap / Future work

Short-term
- Add an indexing / backend service for richer analytics and faster search (optional, hosted).
- Improve verification algorithms (e.g., track interactions across accounts using heuristics).
- Add moderation tools and reporting for reviews/comments.

Medium-term
- Governance model for dApp verification (community voting).
- Reputation system that aggregates verified interactions and rewards high-quality reviewers.
- Mobile-first UI / PWA and wallet deep-linking.

Long-term
- Cross-chain discovery support (e.g., integrate other Move-based chains or EVM ecosystems).
- Decentralized escrow for bounties and rewards connected to dApp onboarding.

---

## Files & locations of interest

- src/constants.ts — network and package constants used across the app
- src/services/sui.ts — Sui RPC and transaction helper code (if present)
- src/services/walrus.ts — Walrus client wrapper
- src/pages/DetailPage.tsx — dApp detail and review flow
- src/components/ReviewWidget — review editor and submit logic
- Move packages (if included in repo) — look for /move or /sui/move directories

---

## License

This project is licensed under the MIT License.

---

Built with developer ergonomics and security in mind — if you are onboarding, start by running `npm ci` and `npm run dev`, connect a testnet wallet, and step through the review/comment flow to see how the Walrus + on-chain reference pattern works end-to-end.

If you want, I can also:
- Generate a `.env.example` from the constants used in the repository.
- Draft CI configuration for GitHub Actions that implements the described gates.
- Produce a basic ADR for the on-chain/off-chain design decision.

```
