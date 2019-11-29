import { TemplateFormatter } from '../interface'
import { ExpressionRecord, ExprKitAction, ExpressionKit, createKit } from '../expression'
import { ReactNode } from 'react'

export class GolangTemplateFormatter implements TemplateFormatter {
  private expr(record: ExpressionRecord, isParentCall: boolean = false): string {
    if (record.type === ExprKitAction.Get) {
      return record.names.map(name => `.${name}`).join('')
    } else {
      const funcName = record.names.map(name => '.' + String(name)).join('')
      const restArgs = record.args.slice()
      const lastArgs = restArgs.pop()
      const isRestAllGet = restArgs.every(rec => rec.type === ExprKitAction.Get)
      const isLastCall = lastArgs.type === ExprKitAction.Call

      if (!isRestAllGet) {
        // 当除了最后一个参数外有其他的函数调用，那么在 golang 中是无法表示的，所以直接报错。
        throw new Error('Cannot call a function with nested function call except the last arguments')
      }

      const restArgsStr = restArgs.map(rec => this.expr(rec))
      const lastStr = this.expr(lastArgs)

      if (isLastCall) {
        return `${lastStr} | ${funcName} ${restArgsStr}`.trim()
      } else {
        return `${funcName} ${restArgsStr}`.trim() + ` ${lastStr}`
      }
    }
  }

  interpolate(record: ExpressionRecord): string {
    return `{{${this.expr(record)}}}`
  }

  condition(record: ExpressionRecord, $then: ReactNode, $else?: ReactNode): ReactNode[] {
    const exprString = this.expr(record)
    return [`{{if ${exprString}}}`, $then, ...($else ? [`{{else}}`, $else] : []), `{{end}}`]
  }

  loop(
    record: ExpressionRecord,
    body: (kit: ExpressionKit, index: ExpressionKit) => ReactNode,
    level: number = 0,
  ): ReactNode[] {
    const rootKit = createKit()
    const indexKit = rootKit[`$index${level}`]
    const valueKit = rootKit[`$value${level}`]
    return [`{{range $index${level}, $value${level} := ${this.expr(record)}}}`, body(valueKit, indexKit), `{{end}}`]
  }
}
