import type { Resource } from "../../src/contracts/index.js";

type Policy = Extract<Resource, { kind: "conditional-access-policy" }>;
type IncludeUser = Extract<
  Policy["properties"]["users"]["includeUsers"],
  { status: "value" }
>["value"][number];
type ExcludeUser = Extract<
  Policy["properties"]["users"]["excludeUsers"],
  { status: "value" }
>["value"][number];

const everyone: IncludeUser = { namespace: "symbolic-user", id: "All" };
const guests: ExcludeUser = { namespace: "symbolic-user", id: "GuestsOrExternalUsers" };
// @ts-expect-error All is an inclusion token, never an exclusion token.
const invalidExclusion: ExcludeUser = { namespace: "symbolic-user", id: "All" };
// @ts-expect-error Unknown symbolic tokens cannot be introduced through inferred types.
const unknownInclusion: IncludeUser = { namespace: "symbolic-user", id: "future-token" };

void [everyone, guests, invalidExclusion, unknownInclusion];
