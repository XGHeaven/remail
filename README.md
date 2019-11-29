# Remail

**Re**actE**mail** is a powerful email template renderer based on [React](https://reactjs.org).

## Feature

- Easy to use
- Compatility with React
- Builtin layout to compact with many email clients
- Powerful plugin support
  - support css-in-js/css module
  - transform className to inline style

## Quick Start

### Write a Email template component

> `List` and `Row` is a wrapper for table layout. You can use `table/tr/td` to replace them.
> `HTML/Head/Body` is designed to running in brwoser/node environment and let it easy to use.

```js
// App.tsx
import { HTML, Head, Body, List, Row } from '@remail/components'

export function App() {
  return (
    <HTML>
      <Head>
        <title>Remail</title>
        <meta name="format-detection" content="email=no" />
        <meta name="format-detection" content="date=no" />
      </Head>
      <Body>
        <List>
          <Row>This is a email template based on React</Row>
          <Row>It's can be running in client/server</Row>
        </List>
      </Body>
    </HTML>
  )
}
```

### Write a file to build template to file.

Here have two way to run this file.

- **You don't use any webpack feature.** Such as import image as url, import less, languager transform, etc.
You can run this file directly by tsc or ts-node. `ts-node build.tsx`

- **You use webpack feature.** Such as import image, babel plugin, etc.
You need build this file before run it. `parcel build build.tsx && ./dist/build.js`

```js
// build.tsx.
import { renderToString, permutation } from '@remail/renderer'
import { App } from './App'
import { writeFileSync } from 'fs'

const html = renderToString(<App/>, {
  // ...options
})
writeFileSync('template.html', html, 'utf8')

// or you can batch build template, such as build different language
// here has a helper function to do full permutation

for (const perm of permutation({
  lang: ['zh-CN', 'en-US', 'ja-JP'],
  country: ['China', 'America', 'Japan']
})) {
  const html = renderToString(<App {...perm}/>, {
    plugins: [
      // please renew plugin for each render
      // because most of plugins has side effect
    ]
  })
  writeFileSync(`template-${perm.lang}-${perm.country}.html`, html)
}
```

### Setup development environment

You can use web development stack to develop email template. Such as webpack/parcel/rollup.

Here use `parcel` as a example.

First, write a html template and a entrypoint file.

```js
// dev.tsx - entrypoint
import { render } from 'react-dom'
import { App } from './App'

render(<App/>, document.getElementById('app')!)
```

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template</title>
</head>
<body>
  <div id="app"></div>
  <script src="./dev.tsx"></script>
</body>
</html>
```

It's done. Just run `parcel serve dev.browser.ts` and open `localhost:1234` to start happy coding.

## Thanks

If you have any questions, please submit an issue.
