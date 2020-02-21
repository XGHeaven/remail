import React, { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Expression } from './expression'
import { Operator as Logic} from './operator'
import { TemplateProvider, Interpolate, TemplateExpressionContext, ForEach, If } from './statement'
import { createKit } from '../lib'

describe('Interpolate', () => {
  function expectInter(expr: Expression<any>, value: any, expected: string) {
    expect(
      renderToStaticMarkup(
        <TemplateProvider value={{ formatter: {} as any, value }}>
          <Interpolate expr={expr} />
        </TemplateProvider>,
      ),
    ).toBe(expected)
  }

  it('should accept expr props', () => {
    expect(
      renderToStaticMarkup(
        <TemplateProvider value={{ formatter: {} as any, value: { a: 1 } }}>
          <Interpolate expr={v => v.a} />
        </TemplateProvider>,
      ),
    ).toBe('1')
  })

  it('should accept children as expression', () => {
    expect(
      renderToStaticMarkup(
        <TemplateProvider value={{ formatter: {} as any, value: { a: 1 } }}>
          <Interpolate>{v => v.a}</Interpolate>
        </TemplateProvider>,
      ),
    ).toBe('1')
  })

  it('should return null when no children or expr prop', () => {
    expect(
      renderToStaticMarkup(
        <TemplateProvider value={{ formatter: {} as any, value: { a: 1 } }}>
          <Interpolate></Interpolate>
        </TemplateProvider>,
      ),
    ).toBe('')
  })

  it('should correct render with multi root', () => {
    const v1 = createKit()
    const v2 = createKit()
    expect(
      renderToStaticMarkup(
        <TemplateProvider value={{ formatter: {} as any, value: { type: 'root' } }}>
          <TemplateExpressionContext.Provider
            value={{
              valueMap: new Map([
                [v1, { type: 'v1' }],
                [v2, { type: 'v2' }],
              ]),
              loopLevel: 0
            }}
          >
            <Interpolate expr={v => v.type} />
            /
            <Interpolate expr={v => v1.type} />
            /
            <Interpolate expr={v => v2.type} />
          </TemplateExpressionContext.Provider>
        </TemplateProvider>,
      ),
    ).toBe('root/v1/v2')
  })
})

describe('If', () => {
  it('should render then node', () => {
    expect(renderToStaticMarkup(
      <TemplateProvider value={{ formatter: {} as any, value: {count: 10}}}>
        <If
          condition={v => Logic.Gt(v.count, 9)}
          then={<Interpolate expr={v =>v.count}/>}
        />
      </TemplateProvider>
    )).toBe('10')
  })

  it('should render false node', () => {
    expect(renderToStaticMarkup(
      <TemplateProvider value={{formatter: {} as any, value: {count: 10}}}>
        <If
          condition={v => Logic.Le(v.count, 9)}
          then={null}
          else={<Interpolate expr={v => v.count}/>}
        />
      </TemplateProvider>
    )).toBe('10')
  })

  it('should accept function', () => {
    const node = <If
      condition={v => Logic.Eq(v.count, 10)}
      then={() => 'then'}
      else={() => 'else'}
    />

    expect(renderToStaticMarkup(
      <TemplateProvider value={{formatter: {} as any, value: {count: 10}}}>
        {node}
      </TemplateProvider>
    )).toBe('then')

    expect(renderToStaticMarkup(
      <TemplateProvider value={{formatter: {} as any, value: {count: 1}}}>
        {node}
      </TemplateProvider>
    )).toBe('else')
  })
})

describe('ForEach', () => {
  function testForEach(
    dataSource: any[],
    render: (v: any, i: any, vs: any[]) => ReactNode,
    expected?: (v: any, i: any, vs: any[]) => string,
  ) {
    const html = renderToStaticMarkup(
      <TemplateProvider value={{ formatter: {} as any, value: { dataSource } }}>
        <ForEach source={v => v.dataSource} render={render} />
      </TemplateProvider>,
    )

    if (expected) {
      expect(html).toBe(dataSource.map(expected).join(''))
    }

    return html
  }

  it('should render object value dataSource', () => {
    testForEach(
      [{ foo: '1' }, { foo: '2' }, { foo: '3' }],
      v => (
        <div>
          <Interpolate expr={() => v.foo} />
        </div>
      ),
      v => `<div>${v.foo}</div>`,
    )
  })

  it('should render primary value dataSource', () => {
    testForEach(
      [1, 2, 3],
      v => (
        <div>
          <Interpolate expr={() => v} />
        </div>
      ),
      v => `<div>${v}</div>`,
    )
  })
})
