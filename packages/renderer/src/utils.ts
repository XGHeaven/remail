/**
 * Generate full permtation array.
 *
 * @example
 * const perms = Array.from(permutation({
 *   a: [1, 2],
 *   b: ['A', 'B', 'C']
 * }))
 * perms === [{a: 1, b: 'A'}, {a: 2, b: 'A'}, {a: 1, b: 'B'}, ... etc] // length is 6
 */
export function *permutation<T extends {}>(permGroup: {
  [K in keyof T]: T[K][]
}): Generator<T, void, void> {
  const keys = Object.keys(permGroup) as (keyof T)[]
  const counts = keys.map(key => permGroup[key].length)
  const total = counts.reduce((t, n) => t * n, 1)

  for (let i = 0; i < total; i++) {
    const ret = {} as T
    let num = i

    for (let j = 0; j < keys.length; j++) {
      const key = keys[j]
      const count = counts[j]
      ret[key] = permGroup[key][num % count]
      num = Math.floor(num / count)
    }

    yield ret
  }
}
