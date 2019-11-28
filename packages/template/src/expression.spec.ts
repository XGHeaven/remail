import {
  recordExpr,
  getExprRecordFromKit,
  ExprKitAction,
  replayExpr,
  ExpressionRecordCallAction,
  isExprKit,
  ExpressionRecord,
  ExpressionRecordGetAction,
} from './expression'

function assertNotNull<T>(val: T): asserts val is NonNullable<T> {
  expect(val).not.toBeNull()
}

function expectIsCallAction(record: ExpressionRecord): asserts record is ExpressionRecordCallAction {
  expect(record.type).toBe(ExprKitAction.Call)
}

function expectIsGetAction(record: ExpressionRecord): asserts record is ExpressionRecordGetAction {
  expect(record.type).toBe(ExprKitAction.Get)
}

describe('recordExpr', () => {
  it('should record property access', () => {
    const record = recordExpr(v => v.a.b)
    assertNotNull(record)
    expect(record.type).toBe(ExprKitAction.Get)
    expect(record.names).toEqual(['a', 'b'])
  })

  it('should record call', () => {
    const record = recordExpr(v => v.a())
    assertNotNull(record)
    expect(record.type).toBe(ExprKitAction.Call)
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
    const callRecord = getExprRecordFromKit(record.context)
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
})

describe('replayExpr', () => {
  it('should works for normal property', () => {
    const record = recordExpr(v => v.a.b)
    assertNotNull(record)
    expect(replayExpr(record, { a: { b: 1 } })).toBe(1)
  })

  it('should works for func call', () => {
    const record = recordExpr(v => v.a())
    assertNotNull(record)
    expect(replayExpr(record, { a: () => 1 })).toBe(1)
  })

  it('should works for func with args', () => {
    const record = recordExpr(v => v.pluswith(v.a, v.b))
    assertNotNull(record)
    expect(replayExpr(record, { a: 1, b: 2, pluswith: (a: number, b: number) => a + b })).toBe(3)
  })

  it('should works when get value from func result', () => {
    const record = recordExpr(v => v.a().b)
    assertNotNull(record)
    expect(replayExpr(record, { a: () => ({ b: 1 }) })).toBe(1)
  })

  it('should works when curring function call', () => {
    const record = recordExpr(v => v.a()())
    assertNotNull(record)
    expect(replayExpr(record, { a: () => () => 1 })).toBe(1)
  })
})
