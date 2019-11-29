export type Expression<T = any, R = any> = (params: T) => R

export const ExpressionRecordSymbol = Symbol.for('remail-expr-parent-record')
export enum ExprKitAction {
  Get = 'get',
  Call = 'call',
}

export interface ExpressionBaseRecord {
  names: Array<string | number>
  kit: any // 存储 record 所属的 kit
  context: any // 用于存储当前访问链的根元素
}

export interface ExpressionRecordCallAction extends ExpressionBaseRecord {
  type: ExprKitAction.Call
  args: (ExpressionRecord | any)[] // 支持字符串常量
}

export interface ExpressionRecordGetAction extends ExpressionBaseRecord {
  type: ExprKitAction.Get
}

export type ExpressionRecord = ExpressionRecordCallAction | ExpressionRecordGetAction

export type ExpressionKit = {
  [key: string]: ExpressionKit
  [key: number]: ExpressionKit
  [ExpressionRecordSymbol]: ExpressionRecord | null
}

function getNamesFromParentRecord(record: ExpressionRecord | null): Array<string | number> {
  if (!record || record.type === ExprKitAction.Call) {
    // 如果是函数调用，那么就重新开始一条新的访问链
    return []
  }

  return record.names
}

function getContextFromParentRecord(record: ExpressionRecord | null): ExpressionKit | null {
  if (!record || record.type === ExprKitAction.Call) {
    // 如果是函数调用，那么就放弃继承 context
    return null
  }

  // 只有在 Get 模式的时候才会继承 context
  return record.context
}

export function createKit(parentRecord: ExpressionRecord | null = null): ExpressionKit {
  const original: any = () => {}
  const kit: any = new Proxy<any>(original, {
    // TODO: 对其他的 handler 进行处理
    get: (target, name) => {
      if (name === ExpressionRecordSymbol) {
        return parentRecord
      }
      if (typeof name === 'symbol') {
        throw new Error('Cannot use symbol as key for template')
      }
      const record: ExpressionRecordGetAction = {
        names: [...getNamesFromParentRecord(parentRecord), name],
        type: ExprKitAction.Get,
        context: getContextFromParentRecord(parentRecord) || kit,
        kit,
      }
      return createKit(record)
    },
    apply: (target, thisArg, args) => {
      const record: ExpressionRecordCallAction = {
        names: getNamesFromParentRecord(parentRecord),
        type: ExprKitAction.Call,
        args: args.map((arg: any) => (isExprKit(arg) ? getExprRecordFromKit(arg) : arg)),
        context: getContextFromParentRecord(parentRecord) || kit,
        kit,
      }

      return createKit(record)
    },
    has(target, key) {
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
  return !!(record.type && record.names)
}

/**
 * Record expression to a record. You can use this record to replay or format it to template syntax
 */
export function recordExpr<T = any>(expr: Expression<T>): ExpressionRecord | null {
  const finalKit = expr((createKit() as unknown) as T)
  return getExprRecordFromKit(finalKit)
}

/**
 * Replay a expression to get value with the record.
 */
export function replayExpr(record: ExpressionRecord, value: any): any {
  if (!isExpressionRecord(record)) {
    // 比如直接返回了数字或者字符串之类的
    return record
  }

  const { context } = record
  const contextRecord = getExprRecordFromKit(context)

  if (contextRecord) {
    // 说明 value 需要从 context 上拿取
    value = replayExpr(contextRecord, value)
  }

  if (record.type === ExprKitAction.Get) {
    // TODO: 检查是否拿了在原型链上的东西
    return record.names.reduce((v, name) => v[name], value)
  } else if (record.type === ExprKitAction.Call) {
    return record.names.reduce((v, name) => v[name], value)(...record.args.map(expr => replayExpr(expr, value)))
  }

  return null
}

export function evalExpr<T, R = any>(expr: Expression<T>, value: T): R {
  return replayExpr(expr((createKit() as unknown) as T), value)
}
