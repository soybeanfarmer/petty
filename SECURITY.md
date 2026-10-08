# Security

## Current status

Petty contains design documents and a development foundation with a help/version-only CLI. There is no released monitor, live collector, hosted service, or production deployment yet.

A supported-version policy will be published with the first release. Current documentation does not establish production support or security certification.

## Reporting a vulnerability

Do not publish exploit details, credentials, or real tenant data in public issues, pull requests, discussions, or attachments.

If GitHub's **Report a vulnerability** option is available in this repository's Security tab, use it for a private report. This file does not enable that GitHub setting.

If private reporting is not available, open a minimal issue requesting a private reporting channel, without describing the vulnerability. A dedicated contact channel and response expectations must be established before production release.

A private report should include affected versions or commits, reproducible steps using sanitized data, expected and actual behavior, and the potential impact. Use a lab you are authorized to test.

## Handling project and tenant data

- Public examples, fixtures, screenshots, and receipts must be synthetic or safely sanitized.
- Store real tenant configuration in controlled private repositories with an explicit ownership and retention policy.
- Keep tokens, client secrets, private keys, and sensitive credential material outside Git.
- Do not assume that deleting a file removes it from Git history or copies held elsewhere.
- Keep tenant-controlled strings untrusted when displaying them, processing them, or providing them to AI.
- Record unsupported or incomplete coverage honestly; do not infer successful security assessment from missing data.

The monitor's read-only tenant permissions do not remove the need to protect identity, role, configuration, and activity information. Writes to authorized evidence repositories and Petty's own operational state are part of the intended architecture.

## Production security work

The [M01 threat model](docs/THREAT_MODEL.md) records initial assets, trust boundaries, risks, and implementation gates. The [product contract](docs/PRODUCT_CONTRACT.md) defines ownership, retention, freshness, and recovery targets. These are requirements, not proof that safeguards already work.

The roadmap includes authorization, credential handling, tenant isolation, recovery exercises, dependency integrity, operating limits, and incident procedures.

Before production use, document supported scope, least-privilege permissions, disclosure channels, secret rotation, retention/deletion behavior, and recovery targets. Active tenant remediation requires a separate product decision and execution boundary.
