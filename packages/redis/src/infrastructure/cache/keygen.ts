import stringify from 'fast-json-stable-stringify'

/**
 * Default cache key generator for method arguments
 *
 * Creates a stable, deterministic cache key from method arguments.
 * @param prefix - The cache key prefix
 * @param methodName - The name of the method being cached
 * @param args - The method arguments
 * @returns A stable cache key string
 */
export function defaultKeyGenerator(
  prefix: string,
  methodName: string,
  args: any[],
): string {
  const serializedArgs = args.map((arg) => {
    if (arg === undefined) return 'undefined'

    if (arg === null) return 'null'

    if (typeof arg === 'object') {
      return stringify(arg)
    }

    return String(arg)
  })

  return `${prefix}:${methodName}:${serializedArgs.join(':')}`
}
