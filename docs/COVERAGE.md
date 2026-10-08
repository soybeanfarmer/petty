# Initial resource and property coverage

- **Milestone:** M01.
- **Status:** planned allowlist; live behavior must be verified in M12–M15.
- **API target:** Microsoft Graph `v1.0`, commercial cloud.

This is the initial scope, not a claim that Petty checks every Microsoft 365 configuration. The [product contract](PRODUCT_CONTRACT.md) defines ownership, timing, outcomes, and limits.

## Planned persisted fields

Retain only the declared fields and normalized relationship IDs. Query with projections where supported; discard undeclared response data before persistence. Record unmonitored field names/coverage gaps without retaining their values. Do not silently upgrade coverage when Graph adds a field.

| Resource | Field allowlist | Interpretation |
| --- | --- | --- |
| Conditional Access policy | `id`, `displayName`, `state`; `conditions.users.includeUsers`, `excludeUsers`, `includeGroups`, `excludeGroups`, `includeRoles`, `excludeRoles` | Identity, enforcement state, and explicit targeting arrays. The first checks interpret state and the three exclusion arrays only. Inclusion arrays provide observed-change context. |
| Active role assignment | `id`, `principalId`, `roleDefinitionId`, `directoryScopeId`, `appScopeId` | Direct principal/role/scope tuple as returned by the active assignment API. Assignment ID is evidence, not the authorization approval key. |
| Built-in role definition | `id`, `templateId`, `displayName`, `isBuiltIn`, `isEnabled`, `version` | Resolve role identity and distinguish the tenant definition ID from its template ID. Never identify protected roles by display name. |
| Referenced principal | Stable object ID; returned `@odata.type` and optional `displayName` when available | Context only for referenced users, groups, or service principals. Store a typed unresolved reference when lookup is unavailable. Do not enumerate full profiles or infer membership. |
| Collection manifest | Tenant ID; allowlist/schema/collector versions; collection interval; endpoint/page completion; errors; scope bounds; original per-scope timestamps and freshness | Defines what evidence is usable. Exact executable manifest schema is M03. |

Optional labels may come from an authorized minimal lookup or limited-information directory response. They are not required for ID-based approvals. No extra permission is implied simply because a name would improve a report.

Policy names and role names are observed metadata; an unexplained rename can be shown as a metadata change without redefining the policy identity. Canonicalization sorts set-like targeting arrays while preserving schema-defined ordered data. Distinguish omitted, null, empty, and unresolved values; normalize equivalence only where a documented schema rule establishes it.

## Three initial checks

| Check | Required baseline | Predicate |
| --- | --- | --- |
| Required policy enabled | Required policy IDs for the bound tenant | The observed policy exists and `state` is exactly `enabled`. `disabled` and `enabledForReportingButNotEnforced` fail. Absence fails only after a compatible, complete, fresh policy listing. |
| Explicit exclusions approved | For each monitored policy, allowed values for each of `excludeUsers`, `excludeGroups`, and `excludeRoles` | Each observed explicit exclusion is in its corresponding approved set. Check typed sets separately. An empty approved set forbids explicit exclusions; a missing baseline set is unknown. |
| Protected role assignment approved | Protected built-in role definition IDs, resolved template IDs, and allowed principal IDs per tenant-wide role | Every applicable active assignment tuple `(tenantId, principalId, roleDefinitionId, directoryScopeId)` is approved. Tenant scope requires `directoryScopeId = "/"` and no conflicting application scope. |

A group principal can be approved for a direct role assignment. This does not approve its members individually or establish their effective privileges. A service-principal assignment can be evaluated by ID without inspecting its credentials or permissions.

An assignment to an unprotected role is not applicable to the protected-role check. A scoped assignment outside tenant scope is outside initial coverage and must be reported as such. A malformed/conflicting scope or a protected role whose definition cannot be resolved is unknown. Custom roles cannot be presented as supported protected built-in roles.

The first exclusion rule concerns only the three named arrays. It does not assess every exception path or the effective audience of a policy. A narrow pass must say which fields were assessed.

## Unsupported semantics and omitted coverage

The initial allowlist excludes grant/session controls, authentication strengths, application/service-principal targeting, guest/external-user objects, device/platform/location/risk conditions, authentication flows, and every other unlisted CA field. A change only in those properties may not create a configuration diff. Petty must disclose this gap; it cannot label its export a complete policy backup.

Keep documented symbolic targeting values, such as `All`, `None`, and `GuestsOrExternalUsers`, distinct from object IDs and from null/empty arrays. The M03 schema must define permitted tokens per individual field from current API documentation. Invalid tokens and new semantic values are unknown/rejected input, never an enabled or safe default.

Unknown or unsupported data blocks only checks that depend on it. It does not invalidate an unrelated narrow state check, but it must not disappear from the coverage summary. Any check requiring effective access/MFA or unmonitored CA fields is unsupported.

Excluded identity/access capabilities:

- Nested, transitive, dynamic, or hidden memberships and all membership expansion.
- PIM eligibility, assignment schedules, activation attribution, expiration/permanence classification.
- Custom role permission analysis, administrative-unit/app-scoped role authorization, full application inventory.
- User passwords/secrets, authentication methods, mailbox content, sign-in/audit events.
- Sovereign/national clouds and Graph beta endpoints.

An activated PIM-derived assignment may appear in active assignments. Petty evaluates the returned active tuple without claiming it is permanent or that all eligible access was collected. M14/M18 must amend this matrix before expanding membership or scope interpretation.

## Read-only endpoint and permission feasibility

The following is a researched candidate plan, not the final consent bundle. Verify API behavior, licensing, property availability, and the least supported permission in M12, then record tested coverage in M13–M15.

| Purpose | Planned endpoint | Documented application read permission / decision |
| --- | --- | --- |
| CA policies | `GET /identity/conditionalAccess/policies` | Operation documentation lists `Policy.Read.All`. The permissions reference also lists narrower `Policy.Read.ConditionalAccess`; test the narrower candidate before selecting consent. |
| Active directory assignments | `GET /roleManagement/directory/roleAssignments` | `RoleManagement.Read.Directory`. |
| Built-in role definitions | `GET /roleManagement/directory/roleDefinitions` | `RoleManagement.Read.Directory`; retain applicable built-in definitions. |
| Optional referenced labels | Minimal authorized user/group/service-principal lookup | Decide whether additional read access is justified. For example, get-user documentation lists `User.Read.All` and service-principal lookup lists `Application.Read.All`; neither is required solely to compare existing principal IDs. |

Do not grant all directory/application permissions by default or adopt a Microsoft write permission for collection. Collectors must honor pagination, deadlines, and throttling. A successful first page, empty response after an error, inaccessible lookup, or permission-limited response is not full coverage.

Conditional Access feature use generally requires Entra ID P1; risk-based capabilities require P2. The authorized live lab must have the appropriate license. Do not diagnose licensing from an empty result or infer compliance from an inaccessible endpoint.

## Primary references

Recheck these during implementation; endpoint and permissions-reference pages can differ.

- [CA policy resource](https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccesspolicy?view=graph-rest-1.0)
- [CA users/targeting resource](https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessusers?view=graph-rest-1.0)
- [List CA policies](https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-list-policies?view=graph-rest-1.0)
- [Graph permission reference: Conditional Access read permission](https://learn.microsoft.com/en-us/graph/permissions-reference#policyreadconditionalaccess)
- [Role assignment resource and scopes](https://learn.microsoft.com/en-us/graph/api/resources/unifiedroleassignment?view=graph-rest-1.0)
- [Role definition resource](https://learn.microsoft.com/en-us/graph/api/resources/unifiedroledefinition?view=graph-rest-1.0)
- [List role assignments](https://learn.microsoft.com/en-us/graph/api/rbacapplication-list-roleassignments?view=graph-rest-1.0)
- [List role definitions](https://learn.microsoft.com/en-us/graph/api/rbacapplication-list-roledefinitions?view=graph-rest-1.0)
- [Get user](https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0)
- [Get service principal](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-get?view=graph-rest-1.0)
- [Graph pagination](https://learn.microsoft.com/en-us/graph/paging)
- [Conditional Access licensing](https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview#license-requirements)
