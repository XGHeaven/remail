import {
  recordExpr,
  getExprRecordFromKit,
  ExpAction,
  replayExpr,
  ExpressionRecordCallAction,
  ExpressionRecord,
  ExpressionRecordGetAction,
  ExpressionRecordType,
  Eq,
  Ne,
  Gt,
  Ge,
  Lt,
  Le,
  And,
  Or,
  Not,
  createKit,
  Expression,
} from './expression'

function assertNotNull<T>(val: T): asserts val is NonNullable<T> {
  expect(val).not.toBeNull()
}

function assertRecordType<T extends ExpAction>(record: any, type: T): asserts record is ExpressionRecordType<T> {
  expect(record.type).toBe(type)
}

function expectIsCallAction(record: ExpressionRecord): asserts record is ExpressionRecordCallAction {
  expect(record.type).toBe(ExpAction.Call)
}

function expectIsGetAction(record: ExpressionRecord): asserts record is ExpressionRecordGetAction {
  expect(record.type).toBe(ExpAction.Get)
}

describe('recordExpr', () => {
  it('should record property access', () => {
    const record = recordExpr(v => v.a.b)
    assertNotNull(record)
    assertRecordType(record, ExpAction.Get)
    expect(record.names).toEqual(['a', 'b'])
  })

  it('should record call', () => {
    const record = recordExpr(v => v.a())
    assertNotNull(record)
    assertRecordType(record, ExpAction.Call)
    expect(record.names).toEqual(['a'])
  })

  it('should record call args', () => {
    const record = recordExpr(v => v.a('name'))
    assertNotNull(record)
    expect((record as ExpressionRecordCallAction).args).toEqual(['name'])
  })

  it('should record call args with kit', () => {
    const record = recordExpr(v => v.a(v.b))
    assertNotNull(record)
    expectIsCallAction(record)
    const [first] = record.args
    expectIsGetAction(first)
    expect(first.names).toEqual(['b'])
  })

  it('should record correct with call and get', () => {
    const record = recordExpr(v => v.a.b().c)
    assertNotNull(record)
    expectIsGetAction(record)
    expect(record.names).toEqual(['c'])
    const callRecord = getExprRecordFromKit(record.root)
    assertNotNull(callRecord)
    expectIsCallAction(callRecord)
    expect(callRecord.names).toEqual(['a', 'b'])
  })

  it('should accept primitive value', () => {
    const record = recordExpr(v => v.foo(1))
    assertNotNull(record)
    expectIsCallAction(record)
    expect(record.args).toEqual([1])
  })

  it('should support binary operator', () => {
    const record = recordExpr(v => Eq(v.a, v.b))
    assertNotNull(record)
    assertRecordType(record, ExpAction.Eq)
    const { lop, rop } = record
    assertRecordType(lop, ExpAction.Get)
    assertRecordType(rop, ExpAction.Get)
    expect(lop.names).toEqual(['a'])
    expect(rop.names).toEqual(['b'])
  })

  it.skip('should show warning when use kit as index', () => {})
})

describe('replayExpr', () => {
  function recordAndEval(expr: Expression<any>, value: any) {
    const root = createKit()
    const record = recordExpr(() => expr(root))
    assertNotNull(record)
    return replayExpr(record, new Map([[root, value]]))
  }

  it('should correct replay with primary value', () => {
    expect(recordAndEval(v => v, 'primary')).toBe('primary')
  })

  it('should works for normal property', () => {
    expect(recordAndEval(v => v.a.b, { a: { b: 1 } })).toBe(1)
  })

  it('should works for func call', () => {
    expect(recordAndEval(v => v.a(), { a: () => 1 })).toBe(1)
  })

  it('should works for func with args', () => {
    expect(recordAndEval(v => v.pluswith(v.a, v.b), { a: 1, b: 2, pluswith: (a: number, b: number) => a + b })).toBe(3)
  })

  it('should works when get value from func result', () => {
    expect(recordAndEval(v => v.a().b, { a: () => ({ b: 1 }) })).toBe(1)
  })

  it('should works when curring function call', () => {
    expect(recordAndEval(v => v.a()(), { a: () => () => 1 })).toBe(1)
  })

  it('should return boolean for relational operator', () => {
    expect(recordAndEval(v => Eq(v.a, v.b), { a: 1, b: 2 })).toBe(false)
    expect(recordAndEval(v => Eq(v.a, v.b), { a: 1, b: 1 })).toBe(true)
  })

  it.each<[string, any, [any, any], [any, any]]>([
    ['Eq', Eq, [1, 1], [1, 2]],
    ['Ne', Ne, [1, 2], [1, 1]],
    ['Gt', Gt, [2, 1], [1, 2]],
    ['Ge', Ge, [1, 1], [1, 2]],
    ['Lt', Lt, [1, 2], [2, 1]],
    ['Le', Le, [1, 1], [2, 1]],
    ['And', And, [true, true], [true, false]],
    ['Or', Or, [true, false], [false, false]],
  ])('should return correct boolean for %s', (_, func, [tva, tvb], [fva, fvb]) => {
    expect(recordAndEval(v => func(v.a, v.b), { a: tva, b: tvb })).toBe(true)
    expect(recordAndEval(v => func(v.a, v.b), { a: fva, b: fvb })).toBe(false)
  })

  it('should return correct boolean for Not', () => {
    expect(recordAndEval(v => Not(v.a), { a: true })).toBe(false)
    expect(recordAndEval(v => Not(v.a), { a: false })).toBe(true)
  })

  it('should support multi root value', () => {
    const ra = createKit()
    const rb = createKit()
    const record = recordExpr(() => And(ra.v, rb.v))
    assertNotNull(record)
    expect(
      replayExpr(
        record,
        new Map([
          [ra, { v: true }],
          [rb, { v: true }],
        ]),
      ),
    ).toBe(true)
  })
})
