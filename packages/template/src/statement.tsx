import React, { createContext, useContext, ReactNode, useMemo } from 'react'
import { Expression, recordExpr, replayExpr, recordExprAndKit, createKit } from './expression'
import { TemplateFormatter } from './interface'
import { Fragment } from 'react'

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
    isOperatorCall: createNoop('isOperatorCall'),
  },
  value: null,
})

export const TemplateProvider = TemplateContext.Provider

export const TemplateExpressionContext = createContext<{
  valueMap: ReadonlyMap<any, any>
  loopLevel: number
}>({
  valueMap: new Map(),
  loopLevel: 0,
})

function defaultLoopNameFormatter(level: number) {
  return [`item${level}`, `index${level}`, `source${level}`]
}

export interface InterpolateProps<V> {
  expr?: Expression<V>
  children?: Expression<V>
}

export function Interpolate<V = any>(props: InterpolateProps<V>) {
  const { formatter, value } = useContext(TemplateContext)
  const { valueMap } = useContext(TemplateExpressionContext)
  const expr = props.expr || props.children
  const [record, kit] = useMemo(() => {
    if (!expr) {
      console.error('You must be provide expr props or children for Interpolate')
      return [null, null]
    }

    return recordExprAndKit(expr)
  }, [expr])

  if (!record) {
    // TODO: show warning
    return null
  }

  if (value) {
    const newValueMap = new Map([...valueMap.entries(), [kit, value]])
    return replayExpr(record, newValueMap)
  } else {
    return formatter.interpolate(record)
  }
}

export interface IfProps<V = any> {
  condition: (v: V) => boolean
  then: ReactNode | (() => ReactNode)
  else?: ReactNode | (() => ReactNode)
}

export function If<V = any>(props: IfProps<V>) {
  const { condition, then: $then, else: $else } = props
  const { formatter, value } = useContext(TemplateContext)
  const { valueMap } = useContext(TemplateExpressionContext)
  const [record, kit] = useMemo(() => recordExprAndKit(condition), [condition])

  if (record === undefined || record === null) {
    // TODO: show warning
    return null
  }

  const thenNode = typeof $then === 'function' ? $then() : $then
  const elseNode = typeof $else === 'function' ? $else() : $else

  if (value) {
    const currentValueMap = new Map([...valueMap.entries(), [kit, value]])
    return replayExpr(record, currentValueMap) ? thenNode : elseNode
  } else {
    return formatter.condition(record, thenNode, elseNode)
  }
}

export interface ForEachProps<V = any, R = any> {
  source: Expression<V, R[]>
  render: (v: R, i: number, source: R[]) => ReactNode
}

export function ForEach<V = any, R = any>(props: ForEachProps<V, R>) {
  const { value, formatter } = useContext(TemplateContext)
  const { valueMap, loopLevel } = useContext(TemplateExpressionContext)
  const { source, render } = props

  const [itemKey, indexKey, sourceKey] = useMemo(() => {
    const loopName = formatter.loopValueName || defaultLoopNameFormatter
    return loopName(loopLevel)
  }, [loopLevel])
  const [sourceRecord, sourceKit] = useMemo(() => recordExprAndKit(source), [source])
  const [renderChildren, renderRoot, renderItem, renderIndex, renderSource] = useMemo(() => {
    const rootKit = createKit()
    const itemKit = rootKit[itemKey]
    const indexKit = rootKit[indexKey]
    const sourceKit = rootKit[sourceKey]
    const children = render((itemKit as unknown) as R, (indexKit as unknown) as number, (sourceKit as unknown) as R[])

    return [children, rootKit, itemKit, indexKit, sourceKit]
  }, [render, loopLevel])

  if (!sourceRecord) {
    return null
  }

  if (value) {
    const currentValueMap = new Map([...valueMap.entries(), [sourceKit, value]])
    const items: any[] = replayExpr(sourceRecord, currentValueMap)
    return (
      <Fragment>
        {items.map((item, index) => (
          <TemplateExpressionContext.Provider
            value={{
              valueMap: new Map([
                ...currentValueMap,
                [
                  renderRoot,
                  {
                    [itemKey]: item,
                    [indexKey]: index,
                    [sourceKey]: items,
                  },
                ],
              ]),
              loopLevel: loopLevel + 1,
            }}
          >
            {renderChildren}
          </TemplateExpressionContext.Provider>
        ))}
      </Fragment>
    )
  } else {
    // TODO: it's a little hard
    return (
      <Fragment>
        {formatter.loop(
          sourceRecord,
          <TemplateExpressionContext.Provider
            value={{
              valueMap,
              loopLevel: loopLevel + 1,
            }}
          >
            {renderChildren}
          </TemplateExpressionContext.Provider>,
          loopLevel,
        )}
      </Fragment>
    )
  }
}
