import React, { ReactNode } from 'react'
import { HTML, Head, Body } from './html'
import { renderToString, RendererContext } from '@remail/renderer'

function render(node: ReactNode, isServer = true) {
  return renderToString(<RendererContext.Provider value={{ isServer }}>{node}</RendererContext.Provider>)
}

describe('components/html', () => {
  describe('HTML', () => {
    it('should render children when in browser', () => {
      expect(render(<HTML>children</HTML>, false)).toBe(`children`)
    })

    it('should render html when in server', () => {
      expect(render(<HTML>children</HTML>)).toBe(`<html>children</html>`)
    })
  })

  describe('Head', () => {
    it('should render head in server', () => {
      expect(
        render(
          <Head>
            <meta name="xxx" />
          </Head>,
        ),
      ).toBe(`<head><meta name="xxx" /></head>`)
    })

    it('should render nothing in browser', () => {
      expect(
        render(
          <Head>
            <meta name="xxx" />
          </Head>,
          false,
        ),
      ).toBe(``)
    })
  })

  describe('Body', () => {
    it('should only render children in browser', () => {
      expect(render(<Body>children</Body>, false)).toBe(`children`)
    })

    it('should render body tag in server', () => {
      expect(render(<Body>children</Body>)).toBe(`<body>children</body>`)
    })
  })
})
