import { TemplateFormatter } from '../interface'
import { ExpressionRecord, ExpressionRecordType } from '../expression'
import { ReactNode } from 'react'

/**
 * - 暂时不考虑 struct 有函数的情况下，因为 golang 模板对结构体有函数的成员和有结构体方法的处理方式不一样
 *   formatter 无法很好的处理以上两种情况，所以这里忽略有结构体方法的情况，假设所有的都只是普通 lambda 函数
 */
export class GolangTemplateFormatter extends TemplateFormatter {
  /**
   * @param record
   * @param isParentCall 标识父级是否是函数调用，如果是的话要额外添加一对括号
   */
  private expr(record: ExpressionRecord, isParentCall: boolean = false): string {
    if (record.type === ExpressionRecordType.Get) {
      const name = record.names.join('.')
      if (name[0] === '$') {
        // 针对 $ 开头的变量，不需要 root
        return name
      }
      if (record.root.type === ExpressionRecordType.Root) {
        // 如果父级是根元素，就直接返回就可以
        return `.${name}`
      } else if (record.root.type === ExpressionRecordType.Call) {
        // 如果父元素是函数调用，生成的时候要加一个括号
        return `(${this.expr(record.root)}).${name}`
      }
      return `${this.expr(record.root)}.${name}`
    } else if (record.type === ExpressionRecordType.Call) {
      if (this.isOperatorCall(record)) {
        console.warn('Operator not support for golang yet. Please use custom function instead.')
      }
      const funcName = this.expr(record.func)
      const args = record.args.map(arg => this.expr(arg, true)).join(' ')

      const ret = `call ${funcName}${args ? ` ${args}` : ''}`
      if (isParentCall) {
        return `(${ret})`
      }
      return ret
    } else if (record.type === ExpressionRecordType.Value) {
      const { value } = record
      if (typeof value === 'object') {
        // 不支持复杂的对象类型
        if (value === null) {
          return 'nil'
        }

        return ''
      } else {
        return JSON.stringify(value)
      }
    } else {
      // 针对 root 来说就直接返回 .
      return '.'
    }
  }

  interpolate(record: ExpressionRecord): String {
    return new String(`{{${this.expr(record)}}}`)
  }

  condition(record: ExpressionRecord, $then: ReactNode, $else?: ReactNode): ReactNode[] {
    const exprString = this.expr(record)
    return [new String(`{{if ${exprString}}}`), $then, ...($else ? [new String(`{{else}}`), $else] : []), new String(`{{end}}`)]
  }

  loop(
    source: ExpressionRecord,
    body: ReactNode,
    level: number = 0,
  ): ReactNode[] {
    const [ valueKey, indexKey, sourceKey ] = this.loopValueName(level)
    return [new String(`{{range ${indexKey}, ${valueKey} := ${this.expr(source)}}}`), body, new String(`{{end}}`)]
  }

  loopValueName(level: number): [string, string, string] {
    return [`$value${level}`, `$index${level}`, `$source${level}`]
  }
}
