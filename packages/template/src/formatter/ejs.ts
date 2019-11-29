import { TemplateFormatter } from '../interface'
import { ExpressionRecord, ExprKitAction, isExpressionRecord } from '../expression'
import { ReactNode } from 'react'

// TODO
export class EjsTemplateFormatter implements TemplateFormatter {
  private expr(record: ExpressionRecord): string {
    if (record.type === ExprKitAction.Get) {
      return record.names.join('.')
    } else {
      return `${record.names.join('.')}(${record.args
        .map(rec => {
          if (isExpressionRecord(rec)) {
            return this.expr(rec)
          }
          return rec
        })
        .join(', ')})`
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
