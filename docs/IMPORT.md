# Clerk: offline import

M05 imports a local snapshot or evaluation bundle into memory, using the version 1.0.0 [contracts](DATA_CONTRACTS.md). It performs no network requests, persistence, Git publication, canonicalization, fingerprint verification, baseline authorization, or security checks.

## Run

After installing the pinned toolchain and building from the repository root:

```sh
npm ci --ignore-scripts
npm run build
npm start -- import --file fixtures/tenant-scenarios/cases/compliant/input.json --tenant 00000000-0000-4000-8000-000000000001
```

The configured tenant must be an explicit, canonical lowercase GUID. It is never inferred from the file or environment. Every nested tenant is validated against it. Supplying a tenant ID does not prove authority to access a real tenant.

The default kind is `evaluationBundle`, matching [M04's fixtures](../fixtures/tenant-scenarios/README.md). Use `--kind snapshot` for a standalone closed snapshot. Individual resources, manifests, baselines, and raw Microsoft Graph exports are unsupported. Repeated, unknown, missing, and invalid options are usage errors. Relative file paths resolve against the caller's working directory; repository examples above assume the repository root.

## Output and errors

Success writes one JSON summary to stdout. `status: "accepted"` means the declared contract and linked invariants passed validation. It is not a security outcome. `securityChecksExecuted` is always false.

The summary includes resource/relationship counts, observed field-state counts, baseline presence, receipt count, and each scope's latest attempt status/interval/page coverage and retained original observation interval/source/count. It reports unavailable fields and incomplete scopes without generating pass/fail assessments. It does not compute current freshness; later checks require an explicit evaluation context. Imported existing receipts are assertions checked for contract consistency, not newly generated or cryptographically verified evidence.

Display names, opaque identifiers, raw resource values, error-code values, baseline assertions, and receipt content are excluded from stdout. The explicit tenant GUID and observation times are still potentially sensitive; treat captured output appropriately.

Failures write one JSON object to stderr, with no stdout summary:

| Exit | Stage            | Meaning                                                                                                        |
| ---- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| 0    | accepted         | Validated import; no security judgment                                                                         |
| 2    | usage            | Invalid options, missing tenant/file, invalid tenant, unsupported kind/operation                               |
| 3    | json or contract | Invalid encoding/JSON, excessive nesting, duplicate keys, schema/version mismatch, or linked invariant failure |
| 4    | file             | Unavailable/nonregular file, unsupported path, size limit, or observed file change                             |
| 1    | internal         | Unexpected implementation failure                                                                              |

Contract failures use `invalid-contract` plus a sorted, deduplicated `issueCodes` list (at most 20 entries), and `issueCodeCount` before truncation. Codes distinguish tenant mismatch, duplicates, scope conflicts, and structural errors. They omit untrusted field names, paths, values, parser messages, and filesystem details. Usage failures point to `--help`.

Unavailable wrappers supported by the contract are accepted and counted. Unknown raw enum values and unsupported contract versions are rejected; no automatic migrations or safe-default substitutions occur.

## Input boundary

- Maximum file size: 8 MiB, including whitespace. This is an initial offline import budget, not a supported maximum tenant-size guarantee.
- Maximum JSON object/array nesting: 64. Duplicate decoded object keys are rejected, including escaped equivalents.
- Strict UTF-8 JSON; no BOM, comments, trailing commas, or concatenated documents.
- Regular local files only. No URLs, stdin, directories, final-component symlinks, UNC/device paths, or Windows alternate data streams. Parent-directory symlinks are not a filesystem confinement boundary.
- The file is opened read-only and bounded reads detect growth. File identity, size, and modification time checks reject observed replacement/change. They cannot prove an atomic snapshot against a hostile host. Unix uses no-follow/nonblocking open flags; Windows uses its supported read-only flag. See [Node filesystem documentation](https://nodejs.org/docs/latest-v24.x/api/fs.html).
- The importer reads no credentials, evaluates no code, and creates no artifacts. Names remain literal data inside the validated model.

The CLI is an operator-run local tool, not a server upload API or filesystem sandbox. Host administrators remain trusted. The public repository must contain synthetic examples only; live data belongs in controlled private storage.

## Module boundary and verification

`src/clerk/importer.ts` exposes `importFile`, returning a typed snapshot or evaluation bundle after tenant-bound validation. `summarize` provides the CLI's bounded projection. `parseInput` and `readInput` isolate the JSON and local-file boundary for tests.

Tests invoke the compiled CLI outside the checkout with an empty credential environment against all 25 saved scenarios. They verify expected rejection stages/codes, unchanged input files, standalone snapshot mode, explicit tenant/options, retained intervals, unavailable fields, hostile labels, size/depth/UTF-8/duplicate-key limits, and sanitized failures. Symlink rejection is exercised on Unix; Windows avoids requiring symbolic-link privileges.

M06 adds Ledger canonicalization and fingerprints. M07/M08 add approved-baseline workflows and deterministic checks. M16 adds private Git publication.
