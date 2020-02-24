import { Operator } from './operator'
import { Expression, recordExprAndKit, replayExpr } from './expression'

describe('Operator', () => {
  function recordAndEval(expr: Expression<any>, value: any) {
    const [kit, root] = recordExprAndKit(expr)
    return replayExpr(kit, new Map([[root, value]]))
  }

  it.each<[string, any, [any, any], [any, any]]>([
    ['Eq', Operator.Eq, [1, 1], [1, 2]],
    ['Ne', Operator.Ne, [1, 2], [1, 1]],
    ['Gt', Operator.Gt, [2, 1], [1, 2]],
    ['Ge', Operator.Ge, [1, 1], [1, 2]],
    ['Lt', Operator.Lt, [1, 2], [2, 1]],
    ['Le', Operator.Le, [1, 1], [2, 1]],
    ['And', Operator.And, [true, true], [true, false]],
    ['Or', Operator.Or, [true, false], [false, false]],
  ])('should return correct boolean for %s', (_, func, [tva, tvb], [fva, fvb]) => {
    expect(recordAndEval(v => func(v.a, v.b), { a: tva, b: tvb })).toBe(true)
    expect(recordAndEval(v => func(v.a, v.b), { a: fva, b: fvb })).toBe(false)
  })
})
