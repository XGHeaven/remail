import { ExpressionRecord, ExpressionKit } from './expression'
import { ReactNode } from 'react'

// TODO: 里面有一些需要返回一个数组的，那么针对字符串来讲，需要一个方式可以直接将字符串渲染出来而不经过转义的方式。
// approach 1: 针对字符串对象，不转义直接渲染。但是缺点是在浏览器环境下依旧会转义，看一下是否会有较大影响吧。
// approach 2: 通过一个组件，内部用 __html 实现。好处是可以兼容浏览器环境，但是必须要包裹一个标签。
export interface TemplateFormatter {
  interpolate: (record: ExpressionRecord) => string
  condition: (record: ExpressionRecord, $then: ReactNode, $else?: ReactNode) => ReactNode[]
  loop: (
    record: ExpressionRecord,
    body: (kit: ExpressionKit, index: ExpressionKit) => ReactNode,
    level?: number,
  ) => ReactNode[]
}
