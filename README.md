# ATLANTIS

Agentic dApp discovery layer on Sui. Monorepo for the Sui Overflow 2026 Walrus track entry.

## Layout

| Directory | What it is | Origin |
| --- | --- | --- |
| `mamiwaterc/` | Move package — on-chain dApp registry, reviews, comments | github.com/Miracle656/atlantis_contract |
| `sui_wrap/` | Move package — Sui Wrapped 2025 NFT | local |
| `backend/` | Express/TS API — Enoki gasless sponsorship + interaction verification | github.com/Miracle656/atlantis_backend |
| `mamiwaterf/` | React/Vite frontend (live at atlantisonsui.wal.app) | github.com/Miracle656/mamiwater |

Each subdirectory keeps its own `package.json` / `Move.toml` and is built independently — there's no root build system yet.

## Develop

```bash
# Frontend
cd mamiwaterf && npm ci && npm run dev

# Backend
cd backend && npm ci && npm run dev

# Move contracts (requires Sui CLI)
cd mamiwaterc && sui move build
cd sui_wrap && sui move build
```

See each package's README for environment variables and deployment notes.
