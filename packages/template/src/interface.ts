import { ExpressionRecord, ExpressionKit, ExpressionRecordCallType, ExpressionRecordType } from './expression'
import { ReactNode } from 'react'
import { Operator } from './operator'

// TODO: 里面有一些需要返回一个数组的，那么针对字符串来讲，需要一个方式可以直接将字符串渲染出来而不经过转义的方式。
// approach 1: 针对字符串对象，不转义直接渲染。但是缺点是在浏览器环境下依旧会转义，看一下是否会有较大影响吧。
// approach 2: 通过一个组件，内部用 __html 实现。好处是可以兼容浏览器环境，但是必须要包裹一个标签。
export abstract class TemplateFormatter {
  abstract interpolate(record: ExpressionRecord): String | string
  abstract condition(record: ExpressionRecord, $then: ReactNode, $else?: ReactNode): ReactNode[]
  abstract loop(record: ExpressionRecord, body: ReactNode, level?: number): ReactNode[]
  // 用于指定循环的变量名称
  abstract loopValueName?(level: number): [string, string, string]

  isOperatorCall(record: ExpressionRecordCallType) {
    const funcRecord = record.func

    if (funcRecord.type === ExpressionRecordType.Get) {
      if (
        funcRecord.root.type === ExpressionRecordType.Root &&
        funcRecord.root.kit === ((Operator as unknown) as ExpressionKit)
      ) {
        return true
      }
    }

    return false
  }
}
