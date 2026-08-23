/**
 * Narrow a free-form string (e.g. a UI control callback value) to a string-literal
 * union by proving membership. Returns `fallback` when the value is not a member.
 */
export function memberOf<T extends string>(union: readonly T[], value: string, fallback: T): T {
  // SAFETY: includes() proves value is one of the union literals before narrowing.
  return (union as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Safe lookup on a literal-keyed record; undefined when the key is absent. */
export function recordGet<K extends string, V>(record: Partial<Record<K, V>>, key: string): V | undefined {
  // SAFETY: hasOwnProperty proves key is one of the record's literal keys before narrowing.
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key as K] : undefined;
}
