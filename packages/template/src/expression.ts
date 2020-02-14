/**
 * 对表达式进行抽象，能够同时提供 eval 和 build 两种模式。
 *
 * 我们将表达式抽象成一个有向无环图，其中有如下类型的节点：
 * - 元根节点，该节点没有任何父节点。元根在这里其实指的就是模板注入的变量。
 *   所以理论上只需要一个元根，但是实际上可能很有很多衍生元根，比如说定义一个变量，取值自模板值。或者针对循环语句每次的循环值。
 *   上面的这些值虽然都是从元根也就是模板变量中获得的，但是在行为上和元根类似，两者没有交集。所以可能会存在多个元根，也可以定义为一个真元根和若干个假元根（衍生元根）
 * - 链接节点，该节点有且只有一个父节点，并且与父节点存在一个关系，目前有取值(Get)。
 * - 联合节点，可以整合其他节点(比如各种逻辑关系等等)，也就是说可以存在多个父节点。父节点之间可以没有任何关系，以及该节点和父节点之间也可以没有任何关系。
 *   而调用(Call)也属于联合节点，因为他可能会接受很多其他的参数。包括各种比较函数
 * - 虚根，联合节点也是一种虚根，只不过这个根是动态计算出来的，而非一开始就指定好的。一切从虚根上出发的链接节点都将以虚根作为真实的根。
 *
 * 并且该图有且只有一个出度为 0 的节点，不论是链接节点还是联合节点还是根，有且只有一个。
 *
 * 在 eval 模式下，我们需要知道每个根所代表的的 value 是多少，所以需要一个 value map。而每一个链接节点都存储了他的根是多少，方便判断。
 * 联合节点来说，有可能会有根信息，也有可能会没有根信息。
 */

export type Expression<T = any, R = any> = (params: T) => R

export const ExpressionRecordSymbol = Symbol.for('remail-expression-record')
export const IsExpressionRecord = Symbol.for('remail-expression-is-record')

// TODO: add/sub/inc/dec/mul/div/concat(for string)
export enum ExpAction {
  Get,
  Call,
  // equal
  Eq,
  // not equal
  Ne,
  // greater than
  Gt,
  // less than
  Lt,
  // greater equal than
  Ge,
  // less equal than
  Le,
  And,
  Or,
  Not,
}

export type ExpBinaryAction =
  | ExpAction.Eq
  | ExpAction.Ge
  | ExpAction.Gt
  | ExpAction.Le
  | ExpAction.Lt
  | ExpAction.Ne
  | ExpAction.Or
  | ExpAction.And
export type ExpUnaryAction = ExpAction.Not

export interface ExpressionNormalRecord {
  type: ExpAction
  // 当前元素的根
  root: any | null
  // 存储 record 所属的 kit
  kit: any
}

export interface ExpressionChainableRecord extends ExpressionNormalRecord {
  names: Array<string | number>
}

export interface ExpressionBinaryRecord extends ExpressionNormalRecord {
  lop: ExpressionRecord | any
  rop: ExpressionRecord | any
}

export interface ExpressionUnaryRecord extends ExpressionNormalRecord {
  op: ExpressionRecord | any
}

// 虽然 Call 是联合节点，但是为了方便实现这里将其用作链接节点
export interface ExpressionRecordCallAction extends ExpressionChainableRecord {
  type: ExpAction.Call
  args: (ExpressionRecord | any)[] // 支持常量值
}

export interface ExpressionRecordGetAction extends ExpressionChainableRecord {
  type: ExpAction.Get
}

export interface ExpressionRecordEqual extends ExpressionBinaryRecord {
  type: ExpAction.Eq
}

export interface ExpressionRecordNotEqual extends ExpressionBinaryRecord {
  type: ExpAction.Ne
}

export interface ExpressionRecordGreater extends ExpressionBinaryRecord {
  type: ExpAction.Gt
}

export interface ExpressionRecordLess extends ExpressionBinaryRecord {
  type: ExpAction.Lt
}

export interface ExpressionRecordGreaterEqual extends ExpressionBinaryRecord {
  type: ExpAction.Ge
}

export interface ExpressionRecordLessEqual extends ExpressionBinaryRecord {
  type: ExpAction.Le
}

export interface ExpressionRecordAnd extends ExpressionBinaryRecord {
  type: ExpAction.And
}

export interface ExpressionRecordOr extends ExpressionBinaryRecord {
  type: ExpAction.Or
}

export interface ExpressionRecordNot extends ExpressionUnaryRecord {
  type: ExpAction.Not
}

export type ExpressionRecordObjectAction = ExpressionRecordCallAction | ExpressionRecordGetAction

export type ExpressionRecordRelational =
  | ExpressionRecordEqual
  | ExpressionRecordNotEqual
  | ExpressionRecordGreater
  | ExpressionRecordLess
  | ExpressionRecordGreaterEqual
  | ExpressionRecordLessEqual

export type ExpressionRecordLogical = ExpressionRecordAnd | ExpressionRecordOr | ExpressionRecordNot

export type ExpressionRecord = ExpressionRecordObjectAction | ExpressionRecordRelational | ExpressionRecordLogical

export type ExpressionKit = {
  [key: string]: ExpressionKit
  [key: number]: ExpressionKit
  [ExpressionRecordSymbol]: ExpressionRecord | null
}

function getNamesFromRecord(record: ExpressionRecord | null): Array<string | number> {
  if (!record) {
    return []
  }

  if (record.type === ExpAction.Get) {
    // only get action can continue chain
    return record.names
  }

  return []
}

function getRootFromRecord(record: ExpressionRecord | null): ExpressionKit | null {
  if (!record) {
    return null
  }

  if (record.type === ExpAction.Get) {
    // only get action can use same context
    return record.root
  }

  // other action no context
  return null
}

export type ExpressionRecordType<T extends ExpAction, R extends ExpressionRecord = ExpressionRecord> = R extends {
  type: T
}
  ? R
  : never
export function createRecord<T extends ExpAction, V extends ExpressionRecord = ExpressionRecordType<T>>(
  type: T,
  record: Omit<V, 'type'>,
): V {
  return {
    type,
    ...record,
    [IsExpressionRecord]: true,
  } as any
}

export function createKit(record: ExpressionRecord | null = null): ExpressionKit {
  // 采用函数作为被代理的对象，目的是既可以支持 Call 又可以支持 Get
  const scapegoat = function scapegoat() {}

  const kit: any = new Proxy<any>(scapegoat, {
    // TODO: 对其他的 handler 进行处理
    get: (_, name) => {
      if (name === ExpressionRecordSymbol) {
        return record
      }
      if (typeof name === 'symbol') {
        // TODO: 对一些常用的 symbol 进行处理
        throw new Error(`Cannot use ${String(name)} symbol as key for template`)
      }
      const childRecord = createRecord(ExpAction.Get, {
        root: getRootFromRecord(record) || kit,
        names: [...getNamesFromRecord(record), name],
        kit,
      })
      return createKit(childRecord)
    },
    apply: (_, _1, args) => {
      const childRecord = createRecord(ExpAction.Call, {
        names: getNamesFromRecord(record),
        args: args.map((arg: any) => (isExprKit(arg) ? getExprRecordFromKit(arg) : arg)),
        root: getRootFromRecord(record) || kit,
        kit,
      })

      return createKit(childRecord)
    },
    has(_, key) {
      if (typeof key !== 'symbol') {
        return true
      } else {
        if (key === ExpressionRecordSymbol) {
          return true
        }
        return false
      }
    },
    ownKeys() {
      return []
    },
  })

  return kit
}

export function getExprRecordFromKit(kit: ExpressionKit): ExpressionRecord
export function getExprRecordFromKit(kit: any): ExpressionRecord | null
export function getExprRecordFromKit(kit: any): ExpressionRecord | null {
  return isExprKit(kit) ? kit[ExpressionRecordSymbol] : null
}

export function isExprKit(kit: any): kit is ExpressionKit {
  if (typeof kit !== 'function') {
    return false
  }
  return Reflect.has(kit, ExpressionRecordSymbol)
}

export function isExpressionRecord(record: any): record is ExpressionRecord {
  return !!(record && record[IsExpressionRecord] === true)
}

/**
 * Record expression to a record. You can use this record to replay or format it to template syntax
 */
export function recordExpr<T = any>(expr: Expression<T>): ExpressionRecord | null {
  const finalKit = expr((createKit() as unknown) as T)
  return getExprRecordFromKit(finalKit)
}

export function recordExprAndKit<T = any>(expr: Expression<T>): [ExpressionRecord | null, ExpressionKit] {
  const kit = createKit()
  const finalKit = expr((kit as unknown) as T)
  return [getExprRecordFromKit(finalKit), kit]
}

/**
 * Replay a expression to get value with the record.
 */
export function replayExpr(
  record: ExpressionRecord,
  valueMap: ReadonlyMap<any, any>,
  cacheMap: WeakMap<any, any> = new WeakMap(),
): any {
  if (!isExpressionRecord(record)) {
    // 比如直接返回了数字或者字符串之类的
    return record
  }

  if (cacheMap.has(record)) {
    return cacheMap.get(record)
  }

  switch (record.type) {
    case ExpAction.Get:
    case ExpAction.Call: {
      const { root } = record
      let value: any
      const rootRecord = getExprRecordFromKit(root)

      if (rootRecord) {
        // 说明 value 需要从 root 上拿取
        value = replayExpr(rootRecord, valueMap, cacheMap)
      } else {
        // 说明父节点是根组件
        if (!valueMap.has(root)) {
          // TODO: console warning
        }
        value = valueMap.get(root)
      }

      // TODO: 检查是否拿了在原型链上的东西
      let ret: any = record.names.reduce((v, name) => v[name], value)
      if (record.type === ExpAction.Call) {
        ret = ret(...record.args.map(expr => replayExpr(expr, valueMap, cacheMap)))
      }
      cacheMap.set(record, ret)
      return ret
    }
    case ExpAction.Eq:
    case ExpAction.Ne:
    case ExpAction.Gt:
    case ExpAction.Ge:
    case ExpAction.Le:
    case ExpAction.Lt:
    case ExpAction.And:
    case ExpAction.Or: {
      const lv = replayExpr(record.lop, valueMap, cacheMap)
      const rv = replayExpr(record.rop, valueMap, cacheMap)

      const { type } = record

      return type === ExpAction.Eq
        ? lv === rv
        : type === ExpAction.Ne
        ? lv !== rv
        : type === ExpAction.Gt
        ? lv > rv
        : type === ExpAction.Ge
        ? lv >= rv
        : type === ExpAction.Lt
        ? lv < rv
        : type === ExpAction.Le
        ? lv <= rv
        : type === ExpAction.And
        ? !!(lv && rv)
        : !!(lv || rv)
    }
    case ExpAction.Not: {
      const v = replayExpr(record.op, valueMap, cacheMap)
      return !v
    }
    default:
      return null
  }
}

export function evalExpr<T, R = any>(expr: Expression<T>, value: T): R {
  const root = createKit()
  return replayExpr(
    expr((root as unknown) as T),
    new Map<any, any>([[root, value]]),
  )
}

function createBinaryOperator<V>(type: ExpBinaryAction) {
  return <L = any, R = any>(lop: L, rop: R): V => {
    const record = createRecord(type, {
      root: null,
      kit: null,
      lop: getExprRecordFromKit(lop) || lop,
      rop: getExprRecordFromKit(rop) || rop,
    })

    const kit = createKit(record)

    record.kit = record.root = kit

    return (kit as unknown) as V
  }
}

function createUnaryOperator<V>(type: ExpUnaryAction) {
  return <O = any>(op: O): V => {
    const record = createRecord(type, {
      root: null,
      kit: null,
      op: getExprRecordFromKit(op) || op,
    })

    const kit = createKit(record)

    record.kit = record.root = kit

    return (kit as unknown) as V
  }
}

export const And = createBinaryOperator<boolean>(ExpAction.And)
export const Or = createBinaryOperator<boolean>(ExpAction.Or)
export const Eq = createBinaryOperator<boolean>(ExpAction.Eq)
export const Ne = createBinaryOperator<boolean>(ExpAction.Ne)
export const Gt = createBinaryOperator<boolean>(ExpAction.Gt)
export const Lt = createBinaryOperator<boolean>(ExpAction.Lt)
export const Ge = createBinaryOperator<boolean>(ExpAction.Ge)
export const Le = createBinaryOperator<boolean>(ExpAction.Le)
export const Not = createUnaryOperator<boolean>(ExpAction.Not)
export const Logic = {
  And : createBinaryOperator<boolean>(ExpAction.And),
  Or : createBinaryOperator<boolean>(ExpAction.Or),
  Eq : createBinaryOperator<boolean>(ExpAction.Eq),
  Ne : createBinaryOperator<boolean>(ExpAction.Ne),
  Gt : createBinaryOperator<boolean>(ExpAction.Gt),
  Lt : createBinaryOperator<boolean>(ExpAction.Lt),
  Ge : createBinaryOperator<boolean>(ExpAction.Ge),
  Le : createBinaryOperator<boolean>(ExpAction.Le),
  Not : createUnaryOperator<boolean>(ExpAction.Not)
}
