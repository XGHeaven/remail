import { EjsTemplateFormatter } from './ejs'
import { recordExpr, Expression } from '../expression'

describe('EjsTemplateFormatter#interpolate', () => {
  const ejs = new EjsTemplateFormatter()

  function formatTest(expr: Expression<any>, expected: string) {
    const result = ejs.interpolate(recordExpr(expr)!)
    expect(result).toBe(expected)
  }

  it('should correct when render property access chain', () => {
    formatTest(v => v.a.b.c, '<%= a.b.c %>')
  })

  it('should correct for function call', () => {
    formatTest(v => v.a.b(), '<%= a.b() %>')
  })

  it('should render function call with args', () => {
    formatTest(v => v.plus(v.a, v.b.c), '<%= plus(a, b.c) %>')
  })
})
