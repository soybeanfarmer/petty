# ADR 0003: Repository toolchain

- **Status:** accepted for M02.
- **Date:** 2026-10-08.
- **Related milestones:** M02, M03, M24.

## Context

The foundation needs reproducible setup and useful checks on Windows and eventual Linux hosts. Avoid adding databases, web frameworks, or tenant semantics before their milestones.

## Decision

Pin Node.js LTS 24.21.0 and bundled npm 11.19.0. Use an npm-generated integrity lockfile and exact development dependencies: TypeScript 7.0.2, Prettier 3.9.9, and Node 24 declarations 24.19.1. Keep the package private without runtime dependencies.

Compile strict ESM using NodeNext resolution and explicit ES2023 output. Use the TypeScript CLI, expected-error strictness guards, and Node's built-in test runner against compiled tests. TypeScript 7 requires optional native platform packages; retain them and avoid assuming a JavaScript compiler API exists.

Use Prettier for source/configuration/document formatting and TypeScript for current language checks. Defer ESLint until specific rules justify it. Pin GitHub actions to SHAs, use read-only tokens without persisted checkout credentials, and run locked installation and identical checks on Linux and Windows.

A help/version-only CLI establishes executable packaging and test behavior without implementing M03 schemas or M05 imports. Portable Node helper scripts replace shell-specific cleanup.

## Consequences

Exact pins require intentional security/version updates. Lifecycle scripts are disabled during installation; optional compiler binaries remain available. The build emits source/tests into ignored `dist/`; an explicit test pattern prevents source/built duplication.

[Development instructions](../DEVELOPMENT.md) define commands and limits. Foundation checks do not establish correct tenant collection or security assessments. Database/frameworks, live authentication, container deployment, and AI remain later milestones.

## Primary references

- [Node 24.21.0 LTS release](https://nodejs.org/en/blog/release/v24.21.0)
- [Node distribution metadata, including npm](https://nodejs.org/dist/index.json)
- [TypeScript 7 release](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [TypeScript NodeNext modules](https://www.typescriptlang.org/tsconfig/module.html)
- [Node test runner](https://nodejs.org/docs/latest-v24.x/api/test.html)
- [Prettier installation](https://prettier.io/docs/install.html)
- [npm clean installation](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [Checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1)
- [Setup-node v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0)
