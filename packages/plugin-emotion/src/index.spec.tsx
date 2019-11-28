/* @jsx jsx */
import { jsx, css, SerializedStyles, Global } from '@emotion/core'
import { EmotionRendererPlugin, GlobalStyleInjectPlaceholder } from './index'
import { renderToString } from '@remail/renderer'

describe('plugin-emotion/EmotionRendererPlugin', () => {
  let emotion: EmotionRendererPlugin

  function name(style: SerializedStyles) {
    return `${emotion.cache.key}-${style.name}`
  }

  beforeEach(() => {
    emotion = new EmotionRendererPlugin({
      streamMode: true,
    })
  })

  it('should works for inject class to element', () => {
    const style = css`
      color: red;
    `
    const out = renderToString(<div css={style}>Emotion</div>, {
      plugins: [emotion],
    })

    expect(out).toBe(`<div class="${name(style)}" style="color:red">Emotion</div>`)
  })

  it('should render media style to global placeholder', () => {
    const style = css`
      color: red;
      @media (max-width: 330px) {
        color: blue;
      }
    `
    const out = renderToString(
      <body>
        <div css={style}>Inner</div>
        <GlobalStyleInjectPlaceholder />
      </body>,
      {
        plugins: [emotion],
      },
    )

    expect(out).toBe(
      `<body><div class="${name(style)}" style="color:red">Inner</div><style>@media (max-width:330px){.${name(
        style,
      )}{color:blue;}}</style></body>`,
    )
  })

  it('should render global style to global placeholder', () => {
    const out = renderToString(
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
      { plugins: [emotion] },
    )

    // console.log(emotion.cache)

    expect(out).toBe(`<div><style>body{color:yellow;}</style></div>`)
  })
})
