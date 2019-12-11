import { createContext, useContext, ReactNode } from 'react'
import { Expression, recordExpr, replayExpr } from './expression'
import { TemplateFormatter } from './interface'

const createNoop = (key: string) => {
  return (() => {
    throw new Error(`Please provide ${key} by TemplateConfig`)
  }) as any
}

// Please use login value using logic.xxx
// Because some logic is class instance, to keep correct this
export const TemplateContext = createContext<{
  formatter: TemplateFormatter
  value?: any
}>({
  formatter: {
    interpolate: createNoop('interpolate'),
    condition: createNoop('condition'),
    loop: createNoop('loop'),
  },
  value: null,
  // forEachFormat: createNoop('forEachFormat')
})

export const TemplateProvider = TemplateContext.Provider

export interface InterpolateProps<V> {
  expr?: Expression<V>
  children?: Expression<V>
}

export function Interpolate<V = any>(props: InterpolateProps<V>) {
  const { formatter, value } = useContext(TemplateContext)
  const expr = props.expr || props.children

  if (!expr) {
    return null
  }

  const record = recordExpr(expr)

  return record ? (value ? replayExpr(record, value) : formatter.interpolate(record)) : null
}

export interface IfProps<V = any> {
  condition: (v: V) => boolean
  then: ReactNode | (() => ReactNode)
  else?: ReactNode | (() => ReactNode)
}

export function If<V>(props: IfProps<V>) {
  const { condition, then: $then, else: $else } = props
  const { formatter, value } = useContext(TemplateContext)

  const record = recordExpr(condition)

  if (!record) {
    return null
  }

  const thenNode = typeof $then === 'function' ? $then() : $then
  const elseNode = typeof $else === 'function' ? $else() : $else

  if (value) {
    return replayExpr(record, value) ? thenNode : elseNode
  } else {
    return formatter.condition(record, thenNode, elseNode)
  }
}

export interface ForEachProps<V, R> {
  source: Expression<V, R[]>
  render: (v: R, i: number, source: R[]) => ReactNode
}

export function ForEach<V = any, R = any>(props: ForEachProps<V, R>) {
  const { value } = useContext(TemplateContext)

  const { source, render } = props

  const record = recordExpr(source)

  if (!record) {
    return []
  }

  if (value) {
    const source: any[] = replayExpr(record, value)
    return source.map(render)
  } else {
    // TODO: it's a little hard
  }
}
