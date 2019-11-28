import React, { ReactNode } from 'react'
import { HTML, Head, Body } from './html'
import { renderToString, RendererContext } from '@remail/renderer'

function render(node: ReactNode) {
  return renderToString(<RendererContext.Provider value={{ isServer: true }}>{node}</RendererContext.Provider>)
}

describe('components/html', () => {
  it('should render nothing when no Head or Body', () => {
    function testEmpty(node: any) {
      expect(render(node)).toBe('<html></html>')
    }

    testEmpty(<HTML></HTML>)
    testEmpty(<HTML>123</HTML>)
    testEmpty(
      <HTML>
        <div>22</div>
      </HTML>,
    )
    testEmpty(
      <HTML>
        <head></head>
        <body></body>
      </HTML>,
    )
  })

  it('should only render first Head or Body', () => {
    expect(
      render(
        <HTML>
          <Head className="first-one"></Head>
          <Head className="second-one"></Head>
          <Body className="first-one">body1</Body>
          <Body className="second-one">body2</Body>
        </HTML>,
      ),
    ).toBe('<html><head class="first-one"></head><body class="first-one"></body></html>')
  })
})
