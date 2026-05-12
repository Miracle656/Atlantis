# **Atlantis Contract — Move package**

Repository: https://github.com/Miracle656/atlantis_contract

> Professional README created with an engineer-first perspective. This README documents the current repository layout, how to get started, recommended development workflows, security & review guidance, and CI patterns.

---

## **Table of contents**
- Project overview
- Current repository snapshot
- Goals and scope
- Architecture & design principles
- Quick start (prerequisites, build, test, lint)
- Common developer tasks & commands
- Deployment / publishing guidance
- Security, review & audit checklist
- CI / Recommended GitHub Actions
- Troubleshooting & common build issues
- Contribution guidelines
- Maintainers, license and contact
- Appendix: Move.toml (current)

---

## **Project overview**
- Name (package): mamiwaterc  
- Language / framework: Move (Sui framework integration)  
- Purpose: A Move package intended to implement smart-contract logic on the Sui ecosystem. The package currently contains configuration (Move.toml, Move.lock) and some repository-level artifacts — source modules and tests need to be added (see “Current repository snapshot”).  
- Status: Early-stage / scaffold. The package manifest exists but core `sources/` and `tests/` appear empty; there is an existing `build_errors.txt` (historical build logs). Use this README as the authoritative next-steps plan for development readiness.

---

## **Current repository snapshot**
- Files present (not exhaustive):
  - Move.toml — package manifest (package name `mamiwaterc`, edition `2024.beta`, dependency on Sui framework pointing at `testnet` revision)  
  - Move.lock — package lockfile  
  - build_errors.txt — historical build output / errors (review before next build iteration)  
  - sources/ — expected location for Move modules (currently empty)  
  - tests/ — expected location for Move tests (currently empty)  
- Note: Because the canonical code (modules/tests) is absent, the package will not build yet. The manifest provides the correct scaffolding to proceed.

---

## **Goals and scope**
Deliver a well-structured, audited Move package that:
- Implements domain-specific logic (on-chain objects, capabilities, access control)
- Is easy to build, test and publish to Sui testnet/devnet
- Has full unit and integration tests
- Follows secure Move idioms (resource-oriented design, least privilege)

### **Short-term objectives**
1. Populate `sources/` with Move modules implementing the contract  
2. Add unit & integration tests in `tests/`  
3. Resolve items in `build_errors.txt`  
4. Add CI to run `sui move build` / `sui move test` on push/PR

---

## **Architecture & design principles**
- Move-first design:
  - Model on-chain state as Move resources with strict access control.
  - Avoid unnecessary public mutable state; expose explicit entry functions.
- Addressing:
  - Named addresses are defined in Move.toml. Current named address:
    - `mamiwaterc = "0x0"` (placeholder — replace with intended owner when publishing)
  - Use `dev-addresses` during local testing to map `@mamiwaterc` to a deterministic test address.
- Modularity:
  - Organize modules by responsibility (core state, admin/roles, helpers, migrators).
  - Keep modules small and focused; prefer explicit capabilities for admin actions.
- Events:
  - Emit structured events for critical lifecycle changes.
- Testing:
  - Unit tests for each module; integration tests to simulate client flows.

---

## **Quick start — prerequisites**
- System requirements:
  - Modern Linux/macOS (or WSL2 on Windows)
  - Git and network access
- Tooling:
  - Sui CLI (install per official documentation: https://github.com/MystenLabs/sui or https://sui.io/docs)
  - Move package tooling compatible with `edition = "2024.beta"`
  - Optional: Rust toolchain for Sui tooling, Node.js for dApp scripts

---

## **Build & test (recommended commands)**
- Inspect manifest:
  - Review `Move.toml` for addresses and dependencies.
- Build:
  - Using Sui CLI:
    - sui move build
  - Or Move package tooling:
    - move build
- Test:
  - sui move test
  - move unit-test (tool-specific)
- Notes:
  - With empty `sources/`, builds will not produce contracts. Add modules first.  
  - If build issues occur, consult `build_errors.txt` for prior failure context.

---

## **Common developer tasks & command snippets**
- Create a module skeleton (example: `sources/ModuleName.move`):
  ```move
  module 0x0::ModuleName {
      use std::signer;
      // resource and functions here
  }
  ```
- Map dev addresses in Move.toml:
  ```toml
  [dev-addresses]
  mamiwaterc = "0xB0B"
  ```
- Run a single test:
  - sui move test --path path/to/test.move  # tool-specific flags vary

---

## **Deployment / publishing guidance**
- Before publishing:
  - Replace placeholder addresses (`0x0`) with the package owner address.
  - Ensure modules are audited and tests pass.
- Publishing:
  - Publish to testnet/devnet first using Sui CLI; once audited, prepare mainnet release.
  - Record the published package ID and update repo metadata.
- Versioning:
  - Use semver for tags/releases and maintain a CHANGELOG.md describing changes and migrations.

---

## **Security, review & audit checklist**
- High-priority checks:
  - Enforce resource invariants (prevent duplication).
  - Minimize capability exposure; gate admin functions.
  - Validate external inputs and addresses.
  - Check computational complexity to avoid DoS.
- Testing & verification:
  - Unit tests for negative/hard cases; integration and fuzz tests where applicable.
  - Consider third-party audit before mainnet deployment.
- Documentation:
  - Document public APIs, invariants, upgrade paths, and emergency procedures.

---

## **CI / Recommended GitHub Actions**
- Minimal CI pipeline:
  - Checkout → Install Sui CLI (or use container) → Build → Run tests → Report.
- Conceptual job snippet:
  ```yaml
  name: CI

  on: [push, pull_request]

  jobs:
    build-and-test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - name: Install dependencies
          run: |
            # Install Sui CLI per official instructions (refer to Sui docs)
            true
        - name: Build Move package
          run: sui move build
        - name: Run Move tests
          run: sui move test
  ```
  - Replace the install step with official Sui install commands or a prebuilt container that contains the required toolchain.

---

## **Troubleshooting & common build issues**
- Mismatched Sui framework revision:
  - `Move.toml` references Sui at `rev = "testnet"`. Align your toolchain or change the dependency revision.
- Named address resolution:
  - Set `dev-addresses` in Move.toml or pass address remapping flags to the build tool.
- Move edition mismatch:
  - Ensure toolchain supports `edition = "2024.beta"`.
- Corrupted lockfile:
  - Regenerate `Move.lock` after confirming dependency versions.
- Review `build_errors.txt`:
  - The repository contains `build_errors.txt`; review it to pinpoint previous failures.

---

## **Contribution guidelines**
- Branching & PRs:
  - Use short-lived feature branches; PRs target `main`. PRs must include: description, testing steps, impact/risk assessment, and requested reviewer.
- Code style:
  - Follow Move idioms and Sui best practices. Keep modules single-purpose.
- Testing:
  - All new logic must include unit tests; critical modules require integration/property tests.
- Security disclosure:
  - For vulnerabilities, open a confidential issue and notify maintainers.

---

## **Maintainers, contact, and ownership**
- Repository owner: Miracle656  
- Maintainers / code owners: (Add a CODEOWNERS file to formalize)  
- Urgent contact: Add on-call or emergency contact details when available

---

## **Licensing & legal**
- License status: No LICENSE file detected in the current snapshot — add a LICENSE (MIT, Apache-2.0, etc.) before public distribution. Work with legal/stakeholders to select an appropriate license.

---

## **Next steps (recommended short-term roadmap)**
1. Populate `sources/` with Move modules that compile  
2. Add unit and integration tests to `tests/`  
3. Review and resolve items captured in `build_errors.txt`  
4. Add a LICENSE and contributor guidance files (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`)  
5. Add CI gating rules (build + tests pass for merges)  
6. Prepare release notes and publish to testnet/devnet; schedule an audit prior to mainnet

---

## **Appendix: current Move.toml**
The repository contains the following package manifest (authoritative as of the current snapshot):

```toml
[package]
name = "mamiwaterc"
edition = "2024.beta" # edition = "legacy" to use legacy (pre-2024) Move
# license = ""           # e.g., "MIT", "GPL", "Apache 2.0"
# authors = ["..."]      # e.g., ["Joe Smith (joesmith@noemail.com)", "John Snow (johnsnow@noemail.com)"]

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "testnet" }

# For remote import, use the `{ git = "...", subdir = "...", rev = "..." }`.
# Revision can be a branch, a tag, and a commit hash.
# MyRemotePackage = { git = "https://some.remote/host.git", subdir = "remote/path", rev = "main" }

# For local dependencies use `local = path`. Path is relative to the package root
# Local = { local = "../path/to" }

# To resolve a version conflict and force a specific version for dependency
# override use `override = true`
# Override = { local = "../conflicting/version", override = true }

[addresses]
mamiwaterc = "0x0"

# Named addresses will be accessible in Move as `@name`. They're also exported:
# for example, `std = "0x1"` is exported by the Standard Library.
# alice = "0xA11CE"

[dev-dependencies]
# The dev-dependencies section allows overriding dependencies for `--test` and
# `--dev` modes. You can introduce test-only dependencies here.
# Local = { local = "../path/to/dev-build" }

[dev-addresses]
# The dev-addresses section allows overwriting named addresses for the `--test`
# and `--dev` modes.
# alice = "0xB0B"
```

--- 

