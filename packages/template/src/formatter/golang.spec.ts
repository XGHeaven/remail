import { GolangTemplateFormatter } from './golang'
import { Expression, recordExpr } from '../expression'

const golang = new GolangTemplateFormatter()

describe('GolangTemplateFormatter#interpolate', () => {
  function formatTest(expr: Expression<any>, expected: string) {
    const result = golang.interpolate(recordExpr(expr)!)
    expect(result).toBe(expected)
  }

  it('should render property access correctly', () => {
    formatTest(v => v.a.b, '{{.a.b}}')
  })

  it('should render func call correctly', () => {
    formatTest(v => v.Cap(v.Title), '{{.Cap .Title}}')
  })

  it('should render pipeline when have two more function call', () => {
    formatTest(v => v.Cap(v.Title, v.Upper(v.Name)), '{{.Upper .Name | .Cap .Title}}')
    formatTest(v => v.Total(v.Upper(v.Name)), '{{.Upper .Name | .Total}}')
  })

  it('should throw error when invalid expression', () => {
    function shouldInvalid(expr: Expression<any>) {
      expect(() => formatTest(expr, '')).toThrow()
    }

    shouldInvalid(v => v.a(v.b(), v.c()))
  })
})

describe('GolangTemplateFormatter#condition', () => {
  const Then = 'then'
  const Else = 'else'
  function test(condition: Expression<any>, expected: any[], hasElse: boolean = false) {
    const result = golang.condition(recordExpr(condition)!, Then, hasElse ? Else : undefined)
    expect(result).toEqual(expected)
  }

  it('should only render then block', () => {
    test(v => v.a, ['{{if .a}}', Then, '{{end}}'], false)
  })

  it('should render then and else block', () => {
    test(v => v.a, ['{{if .a}}', Then, '{{else}}', Else, '{{end}}'], true)
  })
})

describe('GolangTemplateFormatter#loop', () => {
  const Loop = 'loop'
  it('should render correct', () => {
    expect(
      golang.loop(recordExpr(v => v.Names)!, (value, index) => {
        return Loop
      }),
    ).toEqual(['{{range $index0, $value0 := .Names}}', Loop, '{{end}}'])
  })
})
