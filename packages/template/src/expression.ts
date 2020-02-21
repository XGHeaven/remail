/**
 * 对表达式进行抽象，能够同时提供 eval 和 build 两种模式。
 *
 * 我们将表达式抽象成一个有向无环图，其中有如下类型的节点：
 * - 元根节点，该节点没有任何父节点。元根在这里其实指的就是模板注入的变量。
 *   所以理论上只需要一个元根，但是实际上可能很有很多衍生元根，比如说定义一个变量，取值自模板值。或者针对循环语句每次的循环值。
 *   上面的这些值虽然都是从元根也就是模板变量中获得的，但是在行为上和元根类似，两者没有交集。所以可能会存在多个元根，也可以定义为一个真元根和若干个假元根（衍生元根）
 * - 链接节点，该节点有且只有一个父节点，并且与父节点存在一个关系，目前有取值(Get)。
 * - 联合节点，可以整合其他节点(比如各种逻辑关系等等)，但依旧只有一个节点。
 *   比如调用(Call)属于联合节点，因为他可能会接受很多其他的参数。包括各种比较函数
 * - 虚根，联合节点也是一种虚根，只不过这个根是动态计算出来的，而非一开始就指定好的。一切从虚根上出发的链接节点都将以虚根作为真实的根。
 * - 边数据。因为每个节点有且只有一个父节点，所以可以直接将边数据存储在每个节点上
 *
 * 并且该图有且只有一个出度为 0 的节点，不论是链接节点还是联合节点还是根，有且只有一个。
 *
 * 在 eval 模式下，我们需要知道每个根所代表的的 value 是多少，所以需要一个 value map。而每一个链接节点都存储了他的根是多少，方便判断。
 * 联合节点来说，有可能会有根信息，也有可能会没有根信息。
 */

export type Expression<T = any, R = any> = (params: T) => R

// export const ExpressionRecordSymbol = Symbol.for('remail.expression.record')
export const IsExpressionRecord = Symbol.for('remail.expression.is-record')
export const ExpressionKitSymbol = Symbol.for('remail.expression-kit')
export const ExpressionKitAccompanySymbol = Symbol.for('remail.expression.accompany-value')
export const ExpressionKitPaths = Symbol.for('remail.expression-kit.paths')
export const ExpressionKitParent = Symbol.for('remail.expression-kit.parent')
export const ExpressionKitRoot = Symbol.for('remail.expression-kit.root')
export const ExpressionKitRelation = Symbol.for('remail.expression-kit.relation')
export const ExpressionKitBridgeSymbol = Symbol.for('remail.expression-kit.bridge')

export interface ExpressionKitBridgeBase {
  from: ExpressionKit
  dest: ExpressionKit
}

export interface ExpressionKitBridgeOfGet extends ExpressionKitBridgeBase {
  action: ExpAction.Get
  name: string | number
}

export interface ExpressionKitBridgeOfCall extends ExpressionKitBridgeBase {
  action: ExpAction.Call,
  args: any[]
}

export type ExpressionKitBridge = ExpressionKitBridgeOfGet | ExpressionKitBridgeOfCall

export enum ExpAction {
  Get,
  Call,
}

export enum ExpressionRecordType {
  Get,
  Call,
  Value,
  Root
}

export interface ExpressionNormalRecord {
  type: ExpressionRecordType
}

// 虽然 Call 是联合节点，但是为了方便实现这里将其用作链接节点
export interface ExpressionRecordCallAction extends ExpressionNormalRecord {
  type: ExpressionRecordType.Call
  func: ExpressionRecord
  args: (ExpressionRecord | any)[] // 支持常量值
}

export interface ExpressionRecordGetAction extends ExpressionNormalRecord {
  root: ExpressionRecord
  type: ExpressionRecordType.Get
  names: Array<string | number>
}

export interface ExpressionRecordValueAction extends ExpressionNormalRecord {
  type: ExpressionRecordType.Value,
  value: any
}

export interface ExpressionRecordRootAction extends ExpressionNormalRecord {
  type: ExpressionRecordType.Root
  // 使用这个作为唯一标识
  kit: ExpressionKit
}

export type ExpressionKit = {
  [key: string]: ExpressionKit
  [key: number]: ExpressionKit
  [ExpressionKitBridgeSymbol]: ExpressionKitBridge | null
  [ExpressionKitAccompanySymbol]: any
  [ExpressionKitSymbol]: true
}

export type ExpressionRecords = {
  [ExpressionRecordType.Get]: ExpressionRecordGetAction
  [ExpressionRecordType.Call]: ExpressionRecordCallAction
  [ExpressionRecordType.Value]: ExpressionRecordValueAction,
  [ExpressionRecordType.Root]: ExpressionRecordRootAction
}

export type ExpressionRecord = ExpressionRecords[ExpressionRecordType]

export function createRecord<T extends ExpressionRecordType>(
  type: T,
  record: Omit<ExpressionRecords[T], 'type'>,
): ExpressionRecords[T] {
  return {
    type,
    ...record,
    [IsExpressionRecord]: true,
  } as any
}

const defaultHandlers: ProxyHandler<Function> = {
  // TODO: 对其他的 handler 进行处理
  has(_, key) {
    if (typeof key !== 'symbol') {
      return true
    } else {
      switch(key) {
        case ExpressionKitSymbol:
          return true
        default:
          return false
      }
    }
  },
  ownKeys() {
    return []
  },
}

export function createKit(selfBridge: ExpressionKitBridge | null = null): ExpressionKit {
  // 采用函数作为被代理的对象，目的是既可以支持 Call 又可以支持 Get
  const scapegoat = function scapegoat() {}
  const bridges = new Map<string | number, ExpressionKitBridge>()
  let accompany: any = null

  const kit = new Proxy<any>(scapegoat, {
    ...defaultHandlers,
    get: (_, name) => {
      if (typeof name === 'symbol') {
        // TODO: 对一些常用的 symbol 进行处理
        switch(name) {
          case ExpressionKitBridgeSymbol:
            return selfBridge
          case ExpressionKitSymbol:
            return true
          case ExpressionKitAccompanySymbol:
            return accompany
          case Symbol.toPrimitive:
            throw new Error('Cannot transform kit to primitive value used by index or others.')
          default:
            throw new Error(`Cannot use ${String(name)} symbol as key for expression kit`)
        }
      }

      let bridge = bridges.get(name)

      if (bridge) {
        return bridge.dest
      }

      bridge = {
        action: ExpAction.Get,
        name,
        from: kit,
        dest: kit, // placeholder
      }

      const nextKit = createKit(bridge)
      bridge.dest = nextKit
      bridges.set(name, bridge)

      return nextKit
    },
    apply: (_, __, args) => {
      const bridge: ExpressionKitBridgeOfCall = {
        action: ExpAction.Call,
        args,
        from: kit,
        dest: kit, // placeholder
      }

      const nextKit = createKit(bridge)
      bridge.dest = nextKit
      return nextKit
    },
    set(_, name, value) {
      if (name === ExpressionKitAccompanySymbol) {
        accompany = value
        return true
      }
      return false
    }
  })

  return kit
}

export function getExpressionKitBridge(kit: ExpressionKit): ExpressionKitBridge | null {
  return isExprKit(kit) ? kit[ExpressionKitBridgeSymbol] : null
}

export function generateRecord(kit: ExpressionKit, records: WeakMap<any, ExpressionRecord> = new WeakMap()): ExpressionRecord {
  if (!isExprKit(kit)) {
    return createRecord(ExpressionRecordType.Value, {value: kit})
  }

  const bridge = getExpressionKitBridge(kit)

  if (bridge === null) {
    // 对于根来说，是没有边的，所以这里直接使用 kit 代替
    if (records.has(kit)) {
      return records.get(kit)!
    }
    const record =  createRecord(ExpressionRecordType.Root, {kit})
    records.set(kit, record)
    return record
  } else {
    if (records.has(bridge)) {
      return records.get(bridge)!
    }
    if (bridge.action === ExpAction.Get) {
      const names = [bridge.name]
      let root = bridge.from
      while(true) {
        const edge = getExpressionKitBridge(root)

        if (!edge) {
          break
        }

        if (edge.action === ExpAction.Get) {
          // 只有 get 才做才会持续循环并找到虚根
          root = edge.from
          names.unshift(edge.name)
          continue
        }
        break
      }
      const record = createRecord(ExpressionRecordType.Get, {
        root: generateRecord(root, records),
        names
      })
      records.set(bridge, record)
      return record
    } else {
      const record = createRecord(ExpressionRecordType.Call, {
        func: generateRecord(bridge.from, records),
        args: bridge.args.map(arg => generateRecord(arg))
      })
      records.set(bridge, record)
      return record
    }
  }
}

export function isExprKit(kit: any): kit is ExpressionKit {
  if (typeof kit !== 'function') {
    return false
  }
  return Reflect.has(kit, ExpressionKitSymbol)
}

export function isExpressionRecord(record: any): record is ExpressionRecord {
  return !!(record && record[IsExpressionRecord] === true)
}

/**
 * Record expression to a record. You can use this record to replay or format it to template syntax
 */
export function recordExpr<T = any>(expr: Expression<T>): ExpressionRecord {
  return recordExprAndKit(expr)[0]
}

export function recordExprAndKit<T = any>(expr: Expression<T>): [ExpressionRecord, ExpressionKit, ExpressionKit] {
  const kit = createKit()
  const finalKit = expr((kit as unknown) as T)
  return [generateRecord(finalKit), kit, finalKit]
}

export function _replayExpr(record: ExpressionRecord, valueMap: WeakMap<any, any>): any {
  if (valueMap.has(record)) {
    return valueMap.get(record)
  }

  switch(record.type) {
    case ExpressionRecordType.Root: {
      const { kit } = record
      // 这里不再使用 record 作为缓存 key，而是用 kit
      return valueMap.has(kit) ? valueMap.get(kit) : kit[ExpressionKitAccompanySymbol]
    }
    case ExpressionRecordType.Value:
      // TODO: 有可能是复合型值，要递归深入去考虑
      return record.value
    case ExpressionRecordType.Get:
      const root = _replayExpr(record.root, valueMap)
      return record.names.reduce((v, n) => v[n], root)
    case ExpressionRecordType.Call:
      const func = _replayExpr(record.func, valueMap)
      return func(...record.args.map(arg => _replayExpr(arg, valueMap)))
  }
}

/**
 * Replay a expression to get value with the record.
 */
export function replayExpr(
  record: ExpressionRecord,
  valueMap: ReadonlyMap<any, any>,
): any {
  const mixedMap = new WeakMap([...valueMap.entries()])
  return _replayExpr(record, mixedMap)
}

export function evalExpr<T, R = any>(expr: Expression<T>, value: T): R {
  const [record, root] = recordExprAndKit(expr)
  return replayExpr(
    record,
    new Map<any, any>([[root, value]]),
  )
}
