import { ReactNode, ReactElement, isValidElement, Context, ClassicComponentClass, FC, createElement } from 'react'
import { SyncHook, SyncWaterfallHook, Hook } from 'tapable'
import { escapeTextForBrowser } from './react-server-render/escapeTextForBrowser'
import {
  REACT_PROVIDER_TYPE,
  REACT_CONTEXT_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_CONCURRENT_MODE_TYPE,
  REACT_PROFILER_TYPE,
  REACT_SUSPENSE_LIST_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_PORTAL_TYPE,
  REACT_ASYNC_MODE_TYPE,
  REACT_FORWARD_REF_TYPE,
  REACT_MEMO_TYPE,
  REACT_LAZY_TYPE,
  REACT_FUNDAMENTAL_TYPE,
  REACT_RESPONDER_TYPE,
  REACT_SCOPE_TYPE,
} from './react-server-render/symbols'
import { ReactSharedInternals } from './react-server-render/react-internal'
import { Dispatcher as HooksDispatcher } from './react-server-render/renderer-hooks'
import { createMarkupForStyles } from './react-server-render/create-markup'
import {
  getPropertyInfo,
  shouldIgnoreAttribute,
  shouldRemoveAttribute,
  BOOLEAN,
  OVERLOADED_BOOLEAN,
  isAttributeNameSafe,
} from './react-server-render/dom-property'
import { RendererContext } from './context'

export type NonUndefined<T> = T extends undefined ? never : T

const { ReactCurrentDispatcher } = ReactSharedInternals

function normalizeProps(props: OriginalProps): NormalizedProps {
  return Object.keys(props).reduce((newProps, name) => {
    const info = getPropertyInfo(name)

    const value = props[name]
    let attrName: string = name
    let attrVal: string | true | null = null

    if (shouldRemoveAttribute(name, value, info, false)) {
      // 检查 value 空值等问题，跳过
    } else if (name === 'style') {
      const styles = createMarkupForStyles(value)
      if (styles) {
        attrVal = styles
      }
    } else if (shouldIgnoreAttribute(name, info, false)) {
      // 跳过
    } else if (info !== null) {
      const { attributeName, type } = info
      attrName = attributeName
      if (type === BOOLEAN || (type === OVERLOADED_BOOLEAN && value === true)) {
        attrVal = true
      } else {
        attrVal = escapeTextForBrowser(value)
      }
    } else if (isAttributeNameSafe(name)) {
      attrName = name.toLowerCase()
      attrVal = escapeTextForBrowser(value)
    }

    if (attrVal !== null) {
      newProps[attrName] = attrVal
    }

    return newProps
  }, {} as any)
}

function stringifyProps(map: Record<string, string | true>) {
  return Object.entries(map)
    .map(([name, value]) => {
      if (typeof value === 'boolean') {
        return name
      }
      if (!value) {
        return ''
      }
      return `${name}="${value}"`
    })
    .filter(v => !!v)
    .join(' ')
}

function readContext(ctx: Context<any>): any {
  return (ctx as any)._currentValue
}

function isClassComponent(ctr: any): ctr is ClassicComponentClass {
  return !!(ctr && ctr.prototype && ctr.prototype.isReactComponent)
}

function isFunctionComponent(fn: any): fn is FC {
  return !isClassComponent(fn)
}

const selfCloseTags = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]

function isSelfCloseTag(tag: string) {
  return selfCloseTags.includes(tag)
}

export interface RendererPlugin {
  install(renderer: RemailRenderer): any
}

export interface RendererPluginHooks {
  /**
   * 在 props 对象进行处理之前执行。传入的参数为最原始的 props 对象。
   * 建议在修改前先 clone 一份，并返回 clone 之后的对象
   */
  normalizeProps: Hook<OriginalProps, ReactElement, void, OriginalProps | void, OriginalProps>
  /**
   * 在 props 对象标准化之后执行，其中 value 为字符串或者 true。
   * 会自动剔除空值的 props，以及对 style 等元素进行序列化。
   * 当元素的值为字符串的时候，表示 `key="value"`。如果为 true，则表示 `key`
   */
  stringifyProps: Hook<NormalizedProps, ReactElement, void, NormalizedProps | void, NormalizedProps>
  /**
   * 提供对 Element 遍历的能力，如果要进行修改，可以直接调用 React.cloneElement
   */
  visit: Hook<ReactElement, void, void, ReactElement | null | void, ReactElement | null>
  /**
   * 开始的钩子，提供直接修改根组件的能力
   */
  begin: Hook<ReactElement, void, void, ReactElement | void, ReactElement>
  /**
   * 结束的钩子
   */
  end: Hook<ReactElement, void, void, void, void>
}

export type OriginalProps = Readonly<Record<string, any>>
export type NormalizedProps = Record<string, string | true>
export type RendererNormalizePropsHook = (props: OriginalProps, element: ReactElement<any>) => OriginalProps | undefined
export type RendererStringifyPropsHook = (
  props: NormalizedProps,
  element: ReactElement<any>,
) => NormalizedProps | undefined
export type RendererWalkElementHook = (element: ReactElement<any>) => ReactElement<any> | null | undefined
export type RendererVisitHook = (element: ReactElement) => ReactElement | null | undefined
export type RendererBeginHook = (element: ReactElement) => ReactElement | undefined
export type RendererEndHook = () => void

export interface RemailRendererOptions {
  /**
   * You can use builtin HTMLDocType enum. Such as HTMLDocType.HTML5.
   * @default ''
   */
  doctype: string
  plugins: RendererPlugin[]
}

const defaultOptions: RemailRendererOptions = {
  doctype: '',
  plugins: [],
}

// hack: tapable not support bail out in waterfall hook
function passUndefinedHook(hook: Hook<any>) {
  hook.intercept({
    register(tap) {
      const { fn } = tap

      return {
        ...tap,
        fn: (arg1: any, ...others: any[]) => {
          const value = fn(arg1, ...others)
          if (value === void 0) {
            return arg1
          }

          return value
        },
      }
    },
  })

  return hook
}

function bailoutNullHook(hook: Hook<any>) {
  hook.intercept({
    register(tap) {
      const { fn } = tap

      return {
        ...tap,
        fn(arg1: any, ...others: any[]) {
          if (arg1 === null) {
            return null
          }

          return fn(arg1, ...others)
        },
      }
    },
  })
  return hook
}

export class RemailRenderer {
  private contextStacks = new Map<Context<any>, any[]>()
  private it: Iterator<string, void, void> | null = null
  options: RemailRendererOptions

  private _readContext = (ctx: any) => {
    return this.contextStacks.get(ctx)?.[0] ?? (ctx as any)._currentValue
  }

  private dispatcher = {
    ...HooksDispatcher,
    useContext: this._readContext,
    readContext: this._readContext
  }

  finished = false

  hooks: RendererPluginHooks = {
    normalizeProps: passUndefinedHook(
      new SyncWaterfallHook<any>(['props', 'element']),
    ),
    stringifyProps: passUndefinedHook(
      new SyncWaterfallHook<any>(['props', 'element']),
    ),
    visit: bailoutNullHook(
      passUndefinedHook(
        new SyncWaterfallHook<any>(['node']),
      ),
    ),
    begin: passUndefinedHook(
      new SyncWaterfallHook<any>(['root']),
    ),
    end: new SyncHook(),
  }

  constructor(private rootElement: ReactElement, options: Partial<RemailRendererOptions> = {}) {
    this.options = Object.assign({}, defaultOptions, options)

    for (const plugin of this.options.plugins) {
      plugin.install(this)
    }

    // wrap element with RendererContext
    this.rootElement = createElement(
      RendererContext.Provider,
      { value: { isServer: true } },
      this.hook('begin', rootElement),
    )
  }

  private hook<N extends keyof RendererPluginHooks>(
    name: N,
    ...args: Parameters<RendererPluginHooks[N]['call']>
  ): ReturnType<RendererPluginHooks[N]['call']> {
    return this.hooks[name].call(...args) as any
  }

  private pushProvider(context: Context<any>, value: any) {
    const internal: any = (context as any)._context
    const stacks = this.contextStacks.get(internal) ?? []
    stacks.unshift(value)
    this.contextStacks.set(internal, stacks)
  }

  private popProvider(context: Context<any>) {
    const internal = (context as any)._context
    const stacks = this.contextStacks.get(internal) ?? []
    const value = stacks.shift()
    if (stacks.length === 0) {
      this.contextStacks.delete(internal)
    }

    return value
  }

  next(): string {
    if (this.finished) {
      return ''
    }

    if (!this.it) {
      this.it = this.generateNextNode(this.rootElement)
      return this.options.doctype || ''
    }

    const { value, done } = this.it.next()
    if (done) {
      this.finished = true
      this.hook('end')
    }
    return value || ''
  }

  private *generateNextNode(node: ReactNode): Generator<string, void, void> {
    if (typeof node === 'undefined' || node === null || typeof node === 'boolean') {
      yield ''
    } else if (typeof node === 'string' || typeof node === 'number') {
      yield escapeTextForBrowser('' + node)
    } else if (typeof node === 'function') {
      // 会保证不会传入函数
      yield ''
    } else if (Array.isArray(node)) {
      for (const element of node) {
        yield* this.generateNextNode(element)
      }
      yield ''
    } else if (isValidElement(node)) {
      const newNode = this.hook('visit', node)
      if (newNode === null) {
        return yield ''
      }
      const {
        type,
        props: { children, ...props },
      } = newNode
      if (typeof type === 'string') {
        // host component
        // TODO: 针对不同的标签对 props 进行处理，但是由于邮件模板不会用到这些特殊标签，所以暂时不处理
        const tag = type.toLowerCase()
        let html = `<${tag}`
        const dangerHtml = props.dangerouslySetInnerHTML
        const propsString = stringifyProps(
          this.hook('stringifyProps', normalizeProps(this.hook('normalizeProps', props, node)), node),
        )
        if (propsString) {
          html += ' ' + propsString
        }

        if (isSelfCloseTag(tag)) {
          return yield html + ' />'
        }

        html += '>'
        if (dangerHtml && dangerHtml.__html) {
          yield html + dangerHtml.__html
        } else {
          yield html
          yield* this.generateNextNode(children)
        }
        yield `</${tag}>`
      } else if (typeof type === 'function') {
        // class 组件或者是函数式组件
        if (isClassComponent(type)) {
          const instance = new type({ ...props, children })
          const returnChildren = instance.render()
          return yield* this.generateNextNode(returnChildren)
        } else if (!isFunctionComponent(type)) {
          console.warn(`${(type as any).displayName || type.name} component it not support yet`)
          return yield ''
        }

        const prevDispatcher = ReactCurrentDispatcher.current
        ReactCurrentDispatcher.current = this.dispatcher

        const returnChildren = type({
          ...props,
          children,
        })

        ReactCurrentDispatcher.current = prevDispatcher

        yield* this.generateNextNode(returnChildren)
      } else {
        // 内置类型
        // 以下通过 $$typeof 确定类型
        // Context Context.Provider Context.Consumer
        // 以下本身就是 Symbol
        // Fragment
        const $$typeof = typeof type === 'symbol' ? type : ((type as any)['$$typeof'] as symbol)
        switch ($$typeof) {
          // 这些组件是会对渲染树产生影响的，所以给予警告提示
          case REACT_PORTAL_TYPE:
          case REACT_FORWARD_REF_TYPE:
          case REACT_MEMO_TYPE:
          case REACT_LAZY_TYPE:
          case REACT_FUNDAMENTAL_TYPE:
          case REACT_RESPONDER_TYPE:
          case REACT_SCOPE_TYPE:
          case REACT_SUSPENSE_TYPE:
          case REACT_SUSPENSE_LIST_TYPE: {
            console.warn(`${Symbol.keyFor($$typeof)} is not support, fallback to Fragment`)
            return yield* this.generateNextNode(children)
          }

          // 下面这些组件本身不会修改组件树，所以可以直接当做 Fragment
          case REACT_ASYNC_MODE_TYPE:
          case REACT_CONCURRENT_MODE_TYPE:
          case REACT_PROFILER_TYPE:
          case REACT_STRICT_MODE_TYPE:
          case REACT_FRAGMENT_TYPE: {
            return yield* this.generateNextNode(children)
          }

          case REACT_PROVIDER_TYPE: {
            const context: Context<any> = type as any
            const { value } = props
            this.pushProvider(context, value)
            yield* this.generateNextNode(children)
            this.popProvider(context)
            return
          }

          case REACT_CONTEXT_TYPE: {
            const value = this._readContext((type as any)._context as Context<any>)
            if (typeof children !== 'function') {
              console.warn('Context children only be function')
              return yield ''
            }

            const newChildren = children(value)
            return yield* this.generateNextNode(newChildren)
          }
          default:
            console.warn(`Cannot support ${String($$typeof)} as jsx element`)
            return yield ''
        }
      }
    } else if (node instanceof String) {
      // raw string
      return yield node.toString()
    } else if (typeof node === 'object') {
      throw new Error(
        'Objects are not valid as a React child. If you meant to render a collection of children, use an array instead.',
      )
    }
  }
}
