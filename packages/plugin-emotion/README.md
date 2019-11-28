# @remail/plugin-emotion

A emotion plugin for @remail package.

## Feature

- full emotion support.
- auto transform class to inline style


## Requirement

This package only works with @emotion/* not emotion.

## Usage

### string mode

```js
import { EmotionRendererPlugin, GlobalStyleInjectPlaceholder } from '@remail/plugin-emotion'
import { renderToString } from '@remail/core'
import { HTML, Body, Head } from '@remail/components'
import { css, jsx } from '@emotion/core'

const emotionPlugin = new EmotionRendererPlugin()
const original = renderToString(
  <HTML>
    <Head>
      {/* global style should be inject here */}
      <GlobalStyleInjectPlaceholder />
    </Head>
    <Body>
      <div css={css`color: red; @media (max-width: 568px) { color: green; }`}>content</div>
    </Body>
  </HTML>,
  {
    plugins: [emotionPlugin]
  }
)

// inject global style to html
const html = emotionPlugin.injectGlobalStyle(original)
html === `
  <html>
    <head>
      <style>@media (max-width: 569px) {.css-xxxx{color: green !important;}}</style>
    </head>
    <body>
      <div class="css-xxxx" style="color: red">content</div>
    </body>
  </html>
`.split('\n').map(v => v.trim()).join('')
```

### stream mode

In stream mode, Global Style only been injected in last position.

```js
import { EmotionRendererPlugin, GlobalStyleInjectPlaceholder } from '@remail/plugin-emotion'
import { renderToStream } from '@remail/core'
import { HTML, Body, Head } from '@remail/components'
import { css, jsx } from '@emotion/core'

const emotionPlugin = new EmotionRendererPlugin()
const stream = renderToStream(
  <HTML>
    <Head>
    </Head>
    <Body>
      <div css={css`color: red; @media (max-width: 568px) { color: green; }`}>content</div>
      {/* global style only been inject the last place */}
      <GlobalStyleInjectPlaceholder />
    </Body>
  </HTML>,
  {
    plugins: [emotionPlugin]
  }
)

stream.pipe(process.stdout)
```
