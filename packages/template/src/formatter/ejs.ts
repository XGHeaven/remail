import { TemplateFormatter } from '../interface'
import { ExpressionRecord, ExpAction, isExpressionRecord } from '../expression'
import { ReactNode } from 'react'

// TODO
export class EjsTemplateFormatter implements TemplateFormatter {
  private expr(record: ExpressionRecord): string {
    if (record.type === ExpAction.Get) {
      return record.names.join('.')
    } else if (record.type === ExpAction.Call) {
      return `${record.names.join('.')}(${record.args
        .map(rec => {
          if (isExpressionRecord(rec)) {
            return this.expr(rec)
          }
          return rec
        })
        .join(', ')})`
    } else {
      // TODO
      return ''
    }
  }

  interpolate(record: ExpressionRecord): string {
    return `<%= ${this.expr(record)} %>`
  }

  condition(record: ExpressionRecord, $then: ReactNode, $else?: ReactNode): ReactNode[] {
    return []
  }

  loop() {
    return []
  }
}
