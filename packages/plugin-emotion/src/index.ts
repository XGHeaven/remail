import { RendererPlugin } from '@remail/renderer'
import createCache, { EmotionCache } from '@emotion/cache'
import { CacheProvider } from '@emotion/core'
import { createElement } from 'react'

export function GlobalStyleInjectPlaceholder(props: any) {
  return null
}

export const GlobalStyleInjectString = '-=-=-=-THIS_IS_A_PLACEHOLDER_FOR_EMOTION_GLOBAL_STYLE-=-=-=-'

export interface EmotionRendererPluginOptions {
  cache?: EmotionCache
  emitGlobalStyle?: boolean
  /**
   * 去除 className 中和 emotion 相关的 className
   * @default false
   */
  emitClassProp?: boolean
  /**
   * 开启流模式的情况下，会将当前已有获取到的 global style 属性注入到 placeholer 中
   * 不开始流模式的情况下，会以一个占位符代替，等渲染完成之后再通过 injectGlobalStyle 插入 style
   * @default false
   */
  streamMode?: boolean
}

export class EmotionRendererPlugin implements RendererPlugin {
  cache: EmotionCache
  classMap = new Map<string, string>()
  globalStyle = ''
  emitGlobalStyle = false
  emitClassProp = false
  streamMode = false

  constructor(options: EmotionRendererPluginOptions = {}) {
    this.emitGlobalStyle = !!options.emitGlobalStyle
    this.emitClassProp = !!options.emitClassProp
    this.streamMode = !!options.streamMode
    this.cache = createCache({
      stylisPlugins: (context, content, selectors, parent) => {
        // console.log(context, content, selectors, parent)
        // collect class
        const { classMap: map } = this

        switch (context) {
          case 3:
            this.globalStyle += `${selectors.join(',')}{${content}}`
          case 2:
            for (const selector of selectors) {
              map.set(selector, content.endsWith(';') ? content.slice(0, -1) : content)
            }
        }
      },
    })
  }

  injectGlobalStyle(html: string): string {
    return html.replace(GlobalStyleInjectString, this.globalStyle)
  }

  stringifyProps(props: any) {
    const { class: className, ...otherProps } = props
    const classNames: string[] = (className || '').split(' ')
    const unfound: string[] = []
    const styles: string[] = []

    for (const name of classNames) {
      const style = this.classMap.get(`.${name}`)
      if (style) {
        styles.push(style)
      } else {
        unfound.push(name)
      }
    }

    const style = styles.join(';')
    const name = unfound.join(' ')

    if (style) {
      return {
        ...otherProps,
        ...(this.emitClassProp ? { class: name } : { class: className }),
        style: `${props.style ? props.style + ';' : ''}${style}`,
      }
    }

    return props
  }

  begin(root: any) {
    return createElement(CacheProvider, { value: this.cache }, root)
  }

  visit(node: any) {
    if (node.type === 'style') {
      // ignore all style tag except placeholder
      // 不太清楚 inserted 代表的含义是什么？暂且就用来判断是否是全局样式
      const inserted = this.cache.inserted[node.props['data-emotion-css']]
      if (!inserted) {
        // 说明这个是通过 Global 组件注入的，所以直接将内容添加到 globalStyle 中就好了
        this.globalStyle += node.props.dangerouslySetInnerHTML.__html
      }
      return null
    }

    if (node.type === GlobalStyleInjectPlaceholder && !this.emitGlobalStyle) {
      let style = ''
      if (!this.streamMode) {
        style = GlobalStyleInjectString
      } else {
        style = this.globalStyle
        this.globalStyle = ''
      }

      if (style) {
        return createElement('style', { dangerouslySetInnerHTML: { __html: style } })
      }
    }

    return node
  }
}
