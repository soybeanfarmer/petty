# Contributing to Petty

Petty is at the planning stage. Start with [the roadmap](ROADMAP.md) and [architecture](docs/ARCHITECTURE.md) before proposing implementation.

## Work one milestone at a time

1. Identify the milestone ID and the specific completion gate your change addresses.
2. Read the relevant architecture decisions and existing project instructions.
3. Propose a bounded change that can be reviewed and demonstrated independently.
4. Include relevant validation and update documentation when behavior or support coverage changes.
5. Mark a milestone complete only after its full gate is verified, with evidence linked from the PR or release.

Larger milestones may require multiple PRs. Do not expand a documentation or contract change into a full application implementation.

## Project principles

- Microsoft tenant collection remains read-only unless a separate active-response product decision is approved.
- Observed configuration and approved baselines are distinct.
- Partial collection, missing permissions, and unsupported data produce explicit unknown coverage.
- Decisions must be reproducible from versioned inputs.
- AI proposes improvements; released checks make operational decisions.
- Publish public examples using synthetic data. Never contribute real tenant exports or credentials.
- Keep modules independently testable against saved snapshots and preserve host-independent boundaries.

## Development setup

Application scaffolding, package management, and executable scripts do not exist yet. M02 will establish installation, type checking, formatting, test, build, and container commands.

Until then, documentation contributions should verify relative links, milestone IDs/status, Markdown/YAML structure, and consistency with accepted decisions. Do not claim application tests or CI passed when they do not exist.

Once the toolchain is selected, use its committed lockfile and documented scripts. Tests should demonstrate meaningful behavior, including incomplete inputs and false-positive cases.

## Pull requests

Use the PR template to explain the concrete change, the milestone it supports, and the evidence that it works. Describe actual support coverage and limitations. Record permission changes, data-handling changes, and schema compatibility where relevant.

Documentation-only changes should state that validation was limited to documentation. External tenant checks require an authorized lab environment; explain their scope without attaching sensitive exports.

## Issues and feature proposals

Use the milestone template for implementation planning, the bug template for defects, and the feature template for proposed capabilities. Search existing issues before creating duplicates.

New connectors need a declared resource/property scope, documented permissions, synthetic fixtures, and collection-integrity tests. New rules need an explicit policy basis, evidence format, and relevant benign and noncompliant cases.

## Security reports

Follow [SECURITY.md](SECURITY.md). Public issues and PRs are not the place for exploit details, credentials, or sensitive tenant data.

## License

Software license selection is pending. Resolve it before publishing implementation releases or adding third-party material whose redistribution terms affect the project.
