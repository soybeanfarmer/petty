# Development

Petty contains the repository foundation, shared versioned runtime contracts, and synthetic scenario datasets. The CLI supports help/version and tenant-bound local fixture import. Tenant collection and security checks are later milestones. See [Clerk import](IMPORT.md) for usage, limits, and error codes.

## Pinned tools

| Tool                 | Version |
| -------------------- | ------- |
| Node.js LTS          | 24.21.0 |
| npm                  | 11.19.0 |
| TypeScript           | 7.0.2   |
| Prettier             | 3.9.9   |
| Node 24 declarations | 24.19.1 |
| Zod runtime schemas  | 4.6.5   |

Install the pinned Node release with your preferred installer/version manager; it includes the pinned npm. `.node-version` is CI's runtime source, and `.nvmrc` supports compatible local managers. Exact package versions and `package-lock.json` are committed. See [ADR 0003](decisions/0003-toolchain.md).

## Fresh checkout

Run from the repository root:

```sh
npm ci --ignore-scripts
npm run check
npm start -- --help
```

`npm run check` verifies runtime/package-manager versions, formatting, strict types, a clean build, and compiled tests. No Microsoft/Git credentials are required. Show the foundation version with `npm start -- --version`; unsupported operations exit with a usage error.

Install the declared versions rather than bypassing engine checks. Keep optional dependencies enabled: TypeScript 7 distributes its native compiler through platform-specific optional packages. `--ignore-scripts` disables package lifecycle scripts; it does not omit optional packages.

## Commands

| Command                   | Purpose                                                             |
| ------------------------- | ------------------------------------------------------------------- |
| `npm run toolchain:check` | Verify pinned Node/npm through npm's environment.                   |
| `npm run format`          | Apply Prettier to source/configuration/docs.                        |
| `npm run format:check`    | Check formatting without writing.                                   |
| `npm run typecheck`       | Check the project without emitting files.                           |
| `npm run build`           | Remove the fixed `dist/` directory and compile source/tests.        |
| `npm test`                | Build and run only emitted `dist/test/**/*.test.js` tests.          |
| `npm run check`           | Run the complete validation sequence.                               |
| `npm start -- --help`     | Run the previously built CLI.                                       |
| `npm run clean`           | Remove generated build output.                                      |
| `npm run schemas:export`  | Build and export structural JSON Schema to ignored `dist/schemas/`. |

Build before running `npm start` alone. Paths resolve from scripts/modules, not shell-specific cleanup commands. Source uses ESM and relative imports ending in `.js`. This is one small private package. Zod is its only runtime dependency; no bundler, database, web framework, or collector SDK is included.

Strict TypeScript includes null/implicit-any checks, unchecked indexed access, exact optional properties, and no emission after errors. Expected-error compile guards make typecheck fail if those settings are relaxed. They validate tooling, not future tenant-data contracts.

Five subprocess tests exercise actual compiled help/version/usage behavior outside the checkout with no credential environment. Explicit emitted-test selection avoids running source and compiled tests together. Contract tests exercise strict input parsing and linked evidence consistency. Saved-fixture tests read [M04's scenario corpus](../fixtures/tenant-scenarios/README.md), validate the actual files, and protect their defining evidence. Catalog policy outcomes remain specifications until M08 implements the rule engine. See [data contracts](DATA_CONTRACTS.md) for the public validator and JSON Schema limits. The M01 [acceptance cases](ACCEPTANCE_CASES.md) remain rule/collector specifications; M03 tests do not implement those checks.

Prettier owns formatting. TypeScript provides current language checks; ESLint has not been added. A dedicated lint framework can be proposed when specific rules justify it.

## Continuous integration

CI runs `npm ci --ignore-scripts`, `npm run check`, and `npm run schemas:export` on GitHub-hosted Linux and Windows, then checks that tracked files are unchanged. Action versions are pinned to SHAs. The token has read-only contents permission, checkout does not persist credentials, and no tenant secrets are used.

PRs run for all base branches so a milestone can depend on an earlier unmerged PR. Pushes on `main` and `build/**` also run. Require applicable checks through repository settings before production; branch protection is not configured by this workflow.

Change dependencies with pinned npm, regenerate the lockfile using `npm install --ignore-scripts`, and review version/integrity changes. Update runtime pins, engines, packageManager, docs, and lockfile together. Use `npm ci` to verify; do not delete the lockfile to bypass an installation failure.

## Boundaries

Use synthetic data only. No `.env`, credentials, tenant export, private key, or production receipt is needed.

M03 defines runtime contracts; M04 provides saved scenario datasets; M05 provides CLI import. M06 adds canonicalization and fingerprints. Docker Compose deployment belongs to M24. This foundation does not yet provide container deployment or live monitoring.
