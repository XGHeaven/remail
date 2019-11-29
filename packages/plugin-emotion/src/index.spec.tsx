/* @jsx jsx */
import { jsx, css, SerializedStyles, Global } from '@emotion/core'
import { EmotionRendererPlugin, GlobalStyleInjectPlaceholder, EmotionRendererPluginOptions } from './index'
import { renderToString } from '@remail/renderer'
import { ReactElement } from 'react'
import { GlobalStyleInjectString } from '../src'

describe('plugin-emotion/EmotionRendererPlugin', () => {
  function name(style: SerializedStyles) {
    return `css-${style.name}`
  }

  function renderEmotion(
    element: ReactElement,
    options: EmotionRendererPluginOptions = {},
  ): [string, EmotionRendererPlugin] {
    const emotion = new EmotionRendererPlugin({
      ...options,
    })
    return [
      renderToString(element, {
        plugins: [emotion],
      }),
      emotion,
    ]
  }

  it('should works for inject class to element', () => {
    const style = css`
      color: red;
    `
    const [out] = renderEmotion(<div css={style}>Emotion</div>)

    expect(out).toBe(`<div class="${name(style)}" style="color:red">Emotion</div>`)
  })

  it('should render media style to global placeholder', () => {
    const style = css`
      color: red;
      @media (max-width: 330px) {
        color: blue;
      }
    `
    const [out] = renderEmotion(
      <body>
        <div css={style}>Inner</div>
        <GlobalStyleInjectPlaceholder />
      </body>,
      { streamMode: true },
    )

    expect(out).toBe(
      `<body><div class="${name(style)}" style="color:red">Inner</div><style>@media (max-width:330px){.${name(
        style,
      )}{color:blue;}}</style></body>`,
    )
  })

  it('should render global style to global placeholder in stream mode', () => {
    const [out] = renderEmotion(
      <div>
        <Global
          styles={css`
            body {
              color: yellow;
            }
          `}
        />
        <GlobalStyleInjectPlaceholder />
      </div>,
      { streamMode: true },
    )

    expect(out).toBe(`<div><style>body{color:yellow;}</style></div>`)
  })

  it('should only render global style placeholder in string mode', () => {
    const [out, emotion] = renderEmotion(
      <div>
        <Global
          styles={css`
            div {
              left: 0;
            }
          `}
        />
        <GlobalStyleInjectPlaceholder />
      </div>,
    )

    const html = emotion.injectGlobalStyle(out)

    expect(out).toBe(`<div><style>${GlobalStyleInjectString}</style></div>`)
    expect(html).toBe(`<div><style>div{left:0;}</style></div>`)
  })

  it('should correct render when mix style and css', () => {
    const style = css`
      background: red;
    `
    const [out] = renderEmotion(
      <div style={{ color: 'red' }} css={style}>
        content
      </div>,
    )

    expect(out).toBe(`<div style="color:red;background:red" class="${name(style)}">content</div>`)
  })

  it('should emit class props', () => {
    const [out] = renderEmotion(
      <div
        css={css`
          color: red;
        `}
      >
        content
      </div>,
      { emitClassProp: true },
    )

    expect(out).toBe(`<div style="color:red">content</div>`)
  })

  it('should only emit className not include in emotion', () => {
    const [out] = renderEmotion(
      <div
        css={css`
          color: red;
        `}
        className="outer"
      >
        content
      </div>,
      { emitClassProp: true },
    )

    expect(out).toBe(`<div class="outer" style="color:red">content</div>`)
  })
})
