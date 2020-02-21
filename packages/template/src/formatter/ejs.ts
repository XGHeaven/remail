import { TemplateFormatter } from '../interface'
import { ExpressionRecord, ExpressionRecordType, ExpressionKit } from '../expression'
import { ReactNode } from 'react'

export class EjsTemplateFormatter implements TemplateFormatter {
  private expr(record: ExpressionRecord): string {
    switch(record.type) {
      case ExpressionRecordType.Get:
        return record.names.join('.')
      case ExpressionRecordType.Call:
        // TODO: support logic
        return `${this.expr(record.func)}(${record.args.map(rec => this.expr(rec)).join(', ')})`
      case ExpressionRecordType.Root:
        return ''
      case ExpressionRecordType.Value:
        return JSON.stringify(record.value)
    }
  }

  interpolate(record: ExpressionRecord): String {
    return new String(`<%= ${this.expr(record)} %>`)
  }

  condition(record: ExpressionRecord, $then: ReactNode, $else?: ReactNode): ReactNode[] {
    const exprString = this.expr(record)
    return [new String(`<% if (${exprString}) { %>`), $then, new String(`<% } ${$else ? 'else { ' : ''}%>`), ...($else ? [$else, new String('<% } %>')] : [])]
  }

  loop(
    source: ExpressionRecord,
    body: ReactNode,
    level: number = 0,
  ) {
    const [itemKey, indexKey, sourceKey] = this.loopValueName(level)
    return [new String(`<% ${this.expr(source)}.forEach(function(${itemKey}, ${indexKey}, ${sourceKey}) { %>`), body, new String(`<% }) %>`)]
  }

  loopValueName(level: number): [string, string, string] {
    return [`item${level}`, `index${level}`, `source${level}`]
  }
}
