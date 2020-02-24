import { TemplateFormatter } from '../interface'
import { ExpressionRecord, ExpressionRecordType, ExpressionKit } from '../expression'
import { ReactNode } from 'react'
import { Operator } from '../operator'

export class EjsTemplateFormatter extends TemplateFormatter {
  private expr(record: ExpressionRecord): string {
    switch (record.type) {
      case ExpressionRecordType.Get:
        const name = record.names.join('.')
        if (record.root.type === ExpressionRecordType.Root) {
          return name
        }
        return this.expr(record.root) + '.' + name
      case ExpressionRecordType.Call:
        const funcName = this.expr(record.func)
        const args = record.args.map(arg => this.expr(arg))
        if (this.isOperatorCall(record)) {
          const parArgs = args.map(arg => `(${arg})`)
          // TODO: support different priority
          switch (funcName as keyof typeof Operator) {
            case 'And':
              return parArgs.join(' && ')
            case 'Or':
              return parArgs.join(' || ')
            case 'Not':
              return `!(${args[0]})`
            case 'Add':
            case 'Concat':
              return parArgs.join(' + ')
            case 'Sub':
              return parArgs.join(' - ')
            case 'Mul':
              return parArgs.join(' * ')
            case 'Div':
              return parArgs.join(' / ')
            case 'Mod':
              return parArgs.join(' % ')
            case 'Get':
              return `${parArgs[0]}[${args[1]}]`
            case 'Substr':
              return `${parArgs[0]}.substr(${args.slice(1).join(', ')})`
            case 'Lt':
              return parArgs.join(' < ')
            case 'Le':
              return parArgs.join(' <= ')
            case 'Eq':
              return parArgs.join(' === ')
            case 'Ge':
              return parArgs.join(' >= ')
            case 'Gt':
              return parArgs.join(' > ')
          }
        }
        return `${this.expr(record.func)}(${record.args.map(rec => this.expr(rec)).join(', ')})`
      case ExpressionRecordType.Root:
        return ''
      case ExpressionRecordType.Value:
        return JSON.stringify(record.value)
    }
  }

  interpolate(record: ExpressionRecord) {
    return new String(`<%= ${this.expr(record)} %>`)
  }

  condition(record: ExpressionRecord, $then: ReactNode, $else?: ReactNode): ReactNode[] {
    const exprString = this.expr(record)
    return [
      new String(`<% if (${exprString}) { %>`),
      $then,
      new String(`<% } ${$else ? 'else { ' : ''}%>`),
      ...($else ? [$else, new String('<% } %>')] : []),
    ]
  }

  loop(source: ExpressionRecord, body: ReactNode, level: number = 0) {
    const [itemKey, indexKey, sourceKey] = this.loopValueName(level)
    return [
      new String(`<% ${this.expr(source)}.forEach(function(${itemKey}, ${indexKey}, ${sourceKey}) { %>`),
      body,
      new String(`<% }) %>`),
    ]
  }

  loopValueName(level: number): [string, string, string] {
    return [`item${level}`, `index${level}`, `source${level}`]
  }
}
