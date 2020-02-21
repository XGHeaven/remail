import {
  recordExpr,
  replayExpr,
  ExpressionRecordCallAction,
  ExpressionRecord,
  ExpressionRecordGetAction,
  createKit,
  ExpressionRecords,
  ExpressionRecordType,
  evalExpr,
} from './expression'
import { Operator } from './operator'

function assertNotNull<T>(val: T): asserts val is NonNullable<T> {
  expect(val).not.toBeNull()
}

function assertRecordType<T extends ExpressionRecordType>(record: any, type: T): asserts record is ExpressionRecords[T] {
  expect(record.type).toBe(type)
}

function expectIsCallAction(record: ExpressionRecord): asserts record is ExpressionRecordCallAction {
  expect(record.type).toBe(ExpressionRecordType.Call)
}

function expectIsGetAction(record: ExpressionRecord): asserts record is ExpressionRecordGetAction {
  expect(record.type).toBe(ExpressionRecordType.Get)
}

describe('recordExpr', () => {
  it('should record property access', () => {
    const record = recordExpr(v => v.a.b)
    assertNotNull(record)
    expectIsGetAction(record)
    expect(record.names).toEqual(['a', 'b'])
  })

  it('should record call', () => {
    const record = recordExpr(v => v.a())
    assertNotNull(record)
    expectIsCallAction(record)
    const funcRecord = record.func
    expectIsGetAction(funcRecord)
    expect(funcRecord.names).toEqual(['a'])
  })

  it('should record call args', () => {
    const record = recordExpr(v => v.a('name'))
    assertNotNull(record)
    expectIsCallAction(record)
    expect(record.args[0].value).toEqual('name')
  })

  it('should record call args with kit', () => {
    const record = recordExpr(v => v.a(v.b))
    assertNotNull(record)
    expectIsCallAction(record)
    const [first] = record.args
    assertNotNull(first)
    expectIsGetAction(first)
    expect(first.names).toEqual(['b'])
  })

  it('should record correct with call and get', () => {
    const record = recordExpr(v => v.a.b().c)
    assertNotNull(record)
    expectIsGetAction(record)
    expect(record.names).toEqual(['c'])
    const callRecord = record.root
    expectIsCallAction(callRecord)
    expect(callRecord.args).toHaveLength(0)
    const funcRecord = callRecord.func
    expectIsGetAction(funcRecord)
    expect(funcRecord.names).toEqual(['a', 'b'])
  })

  it('should throw a error when use kit as index', () => {
    expect(() => {
      recordExpr(v => v[v.a])
    }).toThrowError('Cannot transform kit to primitive value used by index or others.')
  })
})

describe('replayExpr', () => {
  it('should correct replay with primary value', () => {
    expect(evalExpr(v => v, 'primary')).toBe('primary')
  })

  it('should works for normal property', () => {
    expect(evalExpr(v => v.a.b, { a: { b: 1 } })).toBe(1)
  })

  it('should works for func call', () => {
    expect(evalExpr(v => v.a(), { a: () => 1 })).toBe(1)
  })

  it('should works for func with args', () => {
    expect(evalExpr(v => v.pluswith(v.a, v.b), { a: 1, b: 2, pluswith: (a: number, b: number) => a + b })).toBe(3)
  })

  it('should works when get value from func result', () => {
    expect(evalExpr(v => v.a().b, { a: () => ({ b: 1 }) })).toBe(1)
  })

  it('should works when curring function call', () => {
    expect(evalExpr(v => v.a()(), { a: () => () => 1 })).toBe(1)
  })

  it('should return boolean for relational operator', () => {
    expect(evalExpr(v => Operator.Eq(v.a, v.b), { a: 1, b: 2 })).toBe(false)
    expect(evalExpr(v => Operator.Eq(v.a, v.b), { a: 1, b: 1 })).toBe(true)
  })

  it('should return correct boolean for Not', () => {
    expect(evalExpr(v => Operator.Not(v.a), { a: true })).toBe(false)
    expect(evalExpr(v => Operator.Not(v.a), { a: false })).toBe(true)
  })

  it('should support multi root value', () => {
    const ra = createKit() as any
    const rb = createKit() as any
    const record = recordExpr(() => Operator.And(ra.v, rb.v))
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
