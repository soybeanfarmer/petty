// Compilation guards for the actual project configuration.
// Each expected error becomes a compiler failure if its strictness setting is lost.

// @ts-expect-error Strict null checking rejects null where a string is required.
const nullValue: string = null;

// @ts-expect-error Strict mode rejects an implicitly any parameter.
function implicitAny(value) {
  return value;
}

const values: string[] = [];
// @ts-expect-error Indexed reads may be undefined under noUncheckedIndexedAccess.
const uncheckedValue: string = values[0];

interface OptionalField {
  label?: string;
}
// @ts-expect-error An optional property is absent, rather than explicitly undefined.
const explicitUndefined: OptionalField = { label: undefined };

// Positive cases prevent the fixture from consisting only of rejected inputs.
const guardedValue: string | undefined = values[0];
const omittedOptional: OptionalField = {};
void [nullValue, implicitAny, uncheckedValue, explicitUndefined, guardedValue, omittedOptional];

export {};
