import React, { FC, createContext, useContext, Fragment, StrictMode, ReactElement, Component, useState, useMemo, useRef } from 'react'
import { RemailRenderer, RemailRendererOptions, RendererPluginHooks } from './renderer'

function run(element: ReactElement<any>, options: Partial<RemailRendererOptions> = {}) {
  const renderer = new RemailRenderer(element, options)
  let out = ''
  while (!renderer.finished) {
    out += renderer.next()
  }
  return out
}

describe('renderer/RemailRenderer', () => {
  describe('render for element', () => {
    it('should works for host component', () => {
      expect(run(<div>host</div>)).toBe('<div>host</div>')
    })

    it('should works for number child', () => {
      expect(run(<p>{666}</p>)).toBe('<p>666</p>')
      expect(run(<p>{0}</p>)).toBe('<p>0</p>')
    })

    it('should ignore null, undefeind, boolean', () => {
      for (const value of [true, false, null, undefined]) {
        expect(run(<p>{value}</p>)).toBe('<p></p>')
      }
    })

    it('should works for functional component', () => {
      const App = () => {
        return <div>app</div>
      }
      expect(run(<App />)).toBe('<div>app</div>')
    })

    it.each([
      [
        'useState with val parameter',
        () => {
          const [val] = useState('val')
          return <i>{val}</i>
        },
        '<i>val</i>'
      ], [
        'useState with factory parameter',
        () => <i>{useState(() => 'val')[0]}</i>,
        '<i>val</i>'
      ], [
        'useMemo',
        () => <i>{useMemo(() => 'memo', [])}</i>,
        '<i>memo</i>'
      ], [
        'useRef without initial value',
        () => {
          const ref = useRef<any>()
          expect(ref.current).toBeUndefined()
          ref.current = 'lazy'
          return <i>{ref.current}</i>
        },
        '<i>lazy</i>'
      ], [
        'use with initial value',
      () => <i>{useRef('init').current}</i>,
      '<i>init</i>'
      ]
    ])('should support function component using %s', (name, App, expected) => {
      expect(run(<App/>)).toBe(expected)
    })

    it('should works for class component', () => {
      class App extends Component {
        render() {
          return <div>app</div>
        }
      }

      expect(run(<App />)).toBe('<div>app</div>')
    })

    it('should works for passthrough component', () => {
      const App: FC<any> = ({ children }) => {
        return children
      }

      expect(
        run(
          <App>
            <div>app</div>
          </App>,
        ),
      ).toBe('<div>app</div>')
    })

    it('should render dangeroutlySetInnerHTML', () => {
      expect(run(<div dangerouslySetInnerHTML={{ __html: '<div>xss</div>' }}>ignore children</div>)).toBe(
        '<div><div>xss</div></div>',
      )

      expect(run(<style dangerouslySetInnerHTML={{ __html: '<i>x</i>' }}></style>)).toBe('<style><i>x</i></style>')
    })

    it('should works for context render callback', () => {
      const Context = createContext(false)
      let value!: boolean
      run(
        <Context.Provider value={true}>
          <Context.Consumer>
            {v => {
              value = v
              return ''
            }}
          </Context.Consumer>
        </Context.Provider>,
      )
      expect(value).toBe(true)
    })

    it('should works with context by hooks', () => {
      const Context = createContext(false)
      const App: FC<any> = () => {
        const value = useContext(Context)
        return <p>{value ? 'Yes' : 'No'}</p>
      }

      expect(
        run(
          <Context.Provider value={true}>
            <App />
          </Context.Provider>,
        ),
      ).toBe('<p>Yes</p>')
    })

    it('should get the latest context when have multi provider', () => {
      const Context = createContext(0)
      const GetContext = () => {
        const value = useContext(Context)
        return <p>{value}</p>
      }

      expect(
        run(
          <Context.Provider value={1}>
            <GetContext />
            <Context.Provider value={2}>
              <GetContext />
            </Context.Provider>
            <GetContext />
          </Context.Provider>,
        ),
      ).toBe(['<p>1</p>', '<p>2</p>', '<p>1</p>'].join(''))
    })

    it('should works when nested multi different context', () => {
      const Context1 = createContext('1-0')
      const Context2 = createContext('2-0')

      const ReadContext1 = () => {
        const value = useContext(Context1)
        return <p>{value}</p>
      }

      const ReadContext2 = () => {
        const value = useContext(Context2)
        return <p>{value}</p>
      }

      expect(
        run(
          <Context1.Provider value="1-1">
            <Context2.Provider value="2-1">
              <ReadContext1 />
              <ReadContext2 />
            </Context2.Provider>
          </Context1.Provider>,
        ),
      ).toBe(['<p>1-1</p>', '<p>2-1</p>'].join(''))
    })

    it('should works with Fragment', () => {
      expect(
        run(
          <Fragment>
            <p>1</p>
            <Fragment>
              <p>2</p>
              <p>3</p>
            </Fragment>
          </Fragment>,
        ),
      ).toBe(['<p>1</p>', '<p>2</p>', '<p>3</p>'].join(''))
    })

    it('should works like Fragment for StrictMode', () => {
      expect(
        run(
          <StrictMode>
            <p>1</p>
            <p>2</p>
          </StrictMode>,
        ),
      ).toBe(['<p>1</p>', '<p>2</p>'].join(''))
    })

    it('should render correct style', () => {
      expect(run(<p style={{ fontSize: 16 }}>style</p>)).toBe('<p style="font-size:16px">style</p>')
    })

    it('should transform className to class', () => {
      expect(run(<p className="text lg">class</p>)).toBe(`<p class="text lg">class</p>`)
    })

    it('should transform props correct', () => {
      expect(
        run(
          <table cellPadding="0" cellSpacing="0">
            <tbody>
              <tr>
                <td>text</td>
              </tr>
            </tbody>
          </table>,
        ),
      ).toBe(`<table cellpadding="0" cellspacing="0"><tbody><tr><td>text</td></tr></tbody></table>`)
    })
  })

  describe('options.plugin', () => {
    function runPlugin(element: ReactElement, plugin: { [K in keyof RendererPluginHooks]?: (...args: any[]) => any }) {
      return run(element, {
        plugins: [
          {
            install({ hooks }) {
              for (const key in plugin) {
                const fn = (plugin as any)[key]
                if (fn) {
                  ;(hooks as any)[key].tap('test', fn)
                }
              }
            },
          },
        ],
      })
    }

    function callVisit<T extends (v: V, ...args: any[]) => V | null | undefined, V = any>(
      funcs: T[],
      ...args: [V, ...any[]]
    ): any {
      return (new RemailRenderer((<div>1</div>), {
        plugins: funcs.map(func => ({
          install({ hooks }) {
            hooks.visit.tap('test', func as any)
          },
        })),
      }) as any).hook('visit', ...args)
    }

    it('should return original argument when no funcs', () => {
      expect(callVisit([], 1)).toBe(1)
    })

    it('should ignore undefined return value', () => {
      expect(callVisit([v => undefined], 1)).toBe(1)
    })

    it('should continue to call when return undefined', () => {
      expect(callVisit([v => v + 1, v => undefined, v => v + 1], 0)).toBe(2)
    })

    it('should returns null when one of func returns null', () => {
      expect(callVisit([v => v, v => null], 1)).toBeNull()
    })

    it('should bailout when one of func returns null', () => {
      const fn = jest.fn((v: number) => v + 1)
      expect(callVisit([fn, v => null, fn], 0)).toBe(null)
      expect(fn).toBeCalledTimes(1)
    })

    it('.normalizeProps should run before stringify props', () => {
      const element = (
        <div className="first one">
          <div className="second one" style={{ color: 'red' }}>
            Child Text
          </div>
        </div>
      )

      const fn = jest.fn(v => v)

      const { children, ...expected } = element.props

      runPlugin(element, { normalizeProps: fn })
      expect(fn).toBeCalledTimes(2)
      expect(fn.mock.calls[0][0]).toEqual(expected)
    })

    it('normalizeProps hook should change props by return a new one', () => {
      const fn = jest.fn(v => ({
        ...v,
        className: 'ohhhh',
        style: {
          ...v.style,
          background: 'green',
        },
      }))

      expect(runPlugin(<div style={{ color: 'red' }}>Child</div>, { normalizeProps: fn })).toBe(
        `<div style="color:red;background:green" class="ohhhh">Child</div>`,
      )
    })

    it('stringifyProps hook should change result by return a new one', () => {
      const fn = jest.fn(v => ({
        ...v,
        class: 'yeah',
        style: 'xxx',
        checked: true,
      }))

      expect(runPlugin(<div>Child</div>, { stringifyProps: fn })).toBe(
        `<div class="yeah" style="xxx" checked>Child</div>`,
      )
    })

    it('visit hook should change element by return a new or clone element', () => {
      const Placeholder = () => null
      const fn = jest.fn(node => {
        if (node.type === Placeholder) {
          return <i>I</i>
        }
        return node
      })

      expect(
        runPlugin(
          <div>
            1
            <Placeholder />2
          </div>,
          { visit: fn },
        ),
      ).toBe(`<div>1<i>I</i>2</div>`)
    })

    it('begin hook should called', () => {
      const begin = jest.fn(v => v)
      runPlugin(<div>1</div>, {
        begin,
      })

      expect(begin).toBeCalled()
    })

    it('begin hook should change root element', () => {
      const begin = jest.fn(v => <i>{v}</i>)
      expect(runPlugin(<i>1</i>, { begin })).toBe('<i><i>1</i></i>')
    })
  })
})
