import { ReactElement } from 'react'
import { RemailRendererOptions, RemailRenderer } from './renderer'
import { Readable } from 'stream'

export function renderToString(element: ReactElement, options: Partial<RemailRendererOptions> = {}) {
  const renderer = new RemailRenderer(element, options)
  let html = ''
  while (!renderer.finished) {
    html += renderer.next()
  }

  return html
}

export function renderToStream(element: ReactElement, options: Partial<RemailRendererOptions> = {}) {
  const renderer = new RemailRenderer(element, options)
  let html = ''
  const readable = new Readable({
    read(size) {
      while (size < html.length && !renderer.finished) {
        html += renderer.next()
      }
      this.push(html.slice(0, size))
      html = html.slice(size)
      if (renderer.finished) {
        this.push(html)
        this.push(null)
      }
    },
  })

  return readable
}
