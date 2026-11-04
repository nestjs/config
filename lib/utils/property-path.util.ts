import toPath from 'es-toolkit/compat/toPath';

/**
 * Prototypes shared by every value of their type in the process. A property
 * path never resolves to a member inherited from one of them (e.g.
 * "flags.hasOwnProperty" or "constructor.prototype"), so that a path built
 * from user input can neither read nor write a built-in
 */
const SHARED_PROTOTYPES = new Set<object>([
  ...[
    Object,
    Function,
    Array,
    String,
    Number,
    Boolean,
    Symbol,
    BigInt,
    Date,
    RegExp,
    Error,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Promise,
    ArrayBuffer,
    SharedArrayBuffer,
    DataView,
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    BigInt64Array,
    BigUint64Array,
    Buffer,
  ].map(constructor => constructor.prototype as object),
  // %TypedArray%.prototype and %IteratorPrototype%
  Object.getPrototypeOf(Uint8Array.prototype),
  Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]())),
]);

const UNSAFE_KEYS = new Set<PropertyKey>([
  '__proto__',
  'constructor',
  'prototype',
]);

// Bound once, so that it keeps working if "hasOwnProperty.call" is replaced
export const hasOwn: (target: object, key: PropertyKey) => boolean =
  Function.prototype.call.bind(Object.prototype.hasOwnProperty);

/**
 * Returns whether "key" can be read from "target" as part of a property path:
 * an own property, or one inherited from a prototype that is not a built-in
 * (e.g. a getter of a class instance returned by a "load" factory).
 */
function isReachable(target: object, key: PropertyKey): boolean {
  if (hasOwn(target, key)) {
    return true;
  }
  if (UNSAFE_KEYS.has(key)) {
    return false;
  }
  let owner = Object.getPrototypeOf(target);
  while (owner && !hasOwn(owner, key)) {
    owner = Object.getPrototypeOf(owner);
  }
  return !!owner && !SHARED_PROTOTYPES.has(owner);
}

/**
 * Returns the first key of a property path (e.g. "database" for
 * "database.host"), or the path itself if "object" has it as a key.
 */
export function getRootKey(object: unknown, path: PropertyKey): PropertyKey {
  return object === null || object === undefined
    ? path
    : toSegments(Object(object), path)[0];
}

function toSegments(object: object, path: PropertyKey): PropertyKey[] {
  // Key that exists as is (e.g. "A.B" in process.env) is not split, same as
  // in "es-toolkit"
  if (typeof path !== 'string' || isReachable(object, path)) {
    return [path];
  }
  const segments = toPath(path);
  return segments.length > 1 ? segments : [path];
}

function isIndex(key: PropertyKey): boolean {
  return typeof key === 'string' && /^(?:0|[1-9]\d*)$/.test(key);
}

/**
 * Resolves a property path (e.g. "database.host") against "object".
 * Members inherited from built-in prototypes resolve to `undefined`.
 */
export function getProperty(object: unknown, path: PropertyKey): unknown {
  return resolveProperty(object, path).value;
}

/**
 * Resolves a property path (e.g. "database.host") against "object". "found"
 * tells a path whose value is `undefined` from one that doesn't exist.
 */
export function resolveProperty(
  object: unknown,
  path: PropertyKey,
): { found: boolean; value: unknown } {
  if (object === null || object === undefined) {
    return { found: false, value: undefined };
  }
  let current: unknown = object;
  for (const key of toSegments(Object(object), path)) {
    if (current === null || current === undefined) {
      return { found: false, value: undefined };
    }
    const target = Object(current);
    if (!isReachable(target, key)) {
      return { found: false, value: undefined };
    }
    current = target[key];
  }
  return { found: true, value: current };
}

/**
 * Sets the value at a property path (e.g. "database.host") of "object",
 * creating the missing objects on the way. Only own properties are descended
 * into, so the write can't land on a built-in shared by the whole process.
 * Paths through "__proto__", "constructor" or "prototype" are ignored.
 */
export function setProperty(
  object: Record<PropertyKey, any>,
  path: PropertyKey,
  value: unknown,
): void {
  const segments = toSegments(object, path);
  if (segments.some(key => UNSAFE_KEYS.has(key))) {
    return;
  }
  let current = object;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    let next = hasOwn(current, key) ? current[key] : undefined;
    if (typeof next !== 'object' || next === null) {
      next = isIndex(segments[i + 1]) ? [] : {};
      current[key] = next;
    }
    current = next;
  }
  current[segments[segments.length - 1]] = value;
}
