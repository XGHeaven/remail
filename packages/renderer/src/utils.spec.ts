import { permutation } from './utils'

describe('permutation', () => {
  it('should works', () => {
    const perms = Array.from(permutation(
      {
        a: [1, 2, 3],
        b: ['A', 'B'],
        c: ['a', 'b'],
      }
    ))
    expect(perms).toHaveLength(12)
    expect(
      perms
    ).toMatchSnapshot()
  })
})
