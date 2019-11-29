import { ReactNode, ReactElement, isValidElement, Context, ClassicComponentClass, FC, createElement } from 'react'
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

const { ReactCurrentDispatcher } = ReactSharedInternals

function stringifyPropsToMap(props: Record<string, any>): Record<string, string | true> {
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

function stringifyPropsMap(map: Record<string, string | true>) {
  return Object.entries(map)
    .map(([name, value]) => {
      if (typeof value === 'boolean') {
        return name
      }
      return `${name}="${value}"`
    })
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
  /**
   * 在 props 对象进行处理之前执行。传入的参数为最原始的 props 对象。
   * 建议在修改前先 clone 一份，并返回 clone 之后的对象
   *
   * FIXME: 命名有些丑，下面的几个也是
   */
  beforeStringifyProps?: RendererBeforeStringifyProps
  /**
   * 在 props 对象序列化之后执行，其中 value 为字符串或者 true。
   * 会自动剔除空值的 props，以及对 style 等元素进行序列化。
   * 当元素的值为字符串的时候，表示 `key="value"`。如果为 true，则表示 `key`
   */
  afterStringifyProps?: RendererAfterStringifyProps
  /**
   * 提供对 Element 遍历的能力，如果要进行修改，可以直接调用 React.cloneElement
   */
  walkElement?: RendererWalkElement
  /**
   * 提供直接修改根组件的能力
   */
  rootElement?: RendererWalkElement
}

export type StringifyPropsMap = Record<string, string | true>
export type RendererBeforeStringifyProps = (props: Record<string, any>) => Record<string, any>
export type RendererAfterStringifyProps = (props: StringifyPropsMap) => StringifyPropsMap
export type RendererWalkElement = (element: ReactElement<any>) => ReactElement<any> | null

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

export class RemailRenderer {
  private contextStack: any[] = []
  options: RemailRendererOptions
  it: Iterator<string, void, void> | null = null
  finished = false

  private beforeStringifyProps: RendererBeforeStringifyProps
  private afterStringifyProps: RendererAfterStringifyProps
  private walkElement: RendererWalkElement

  constructor(private rootElement: ReactElement, options: Partial<RemailRendererOptions> = {}) {
    this.options = Object.assign({}, defaultOptions, options)
    this.beforeStringifyProps = this.componseFunction('beforeStringifyProps')
    this.afterStringifyProps = this.componseFunction('afterStringifyProps')
    this.walkElement = this.componseFunction('walkElement')
    // wrap element with RendererContext
    this.rootElement = createElement(
      RendererContext.Provider,
      { value: { isServer: true } },
      this.componseFunction('rootElement')(rootElement),
    )
  }

  private componseFunction(name: string) {
    const funcs = this.options.plugins
      .map((plugin: any) => {
        if (plugin[name]) {
          return (v: any) => plugin[name](v)
        }
        return null
      })
      .filter<(v: any) => any>((v): v is any => !!v)

    return (input: any) => {
      for (const func of funcs) {
        input = func(input)
      }
      return input
    }
  }

  pushProvider(context: Context<any>, value: any) {
    const internalContext: any = (context as any)._context
    const preValue = internalContext._currentValue
    this.contextStack.push(preValue)
    internalContext._currentValue = value
  }

  popProvider(context: Context<any>) {
    const value = this.contextStack.pop()
    ;(context as any)._context._currentValue = value
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
    }
    return value || ''
  }

  *generateNextNode(node: ReactNode): Generator<string, void, void> {
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
      const newNode = this.walkElement(node)
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
        const propsString = stringifyPropsMap(
          this.afterStringifyProps(stringifyPropsToMap(this.beforeStringifyProps(props))),
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
        ReactCurrentDispatcher.current = HooksDispatcher

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
            const value = readContext((type as unknown) as Context<any>)
            if (typeof children !== 'function') {
              console.warn('Context children only be function')
              return yield ''
            }

            const newChildren = children(value)
            return yield* this.generateNextNode(newChildren)
          }
          default:
            return yield ''
        }
      }
    }
  }
}
