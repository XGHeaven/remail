import React from 'react'
import { GolangTemplateFormatter } from './golang'
import { Expression, recordExpr } from '../expression'
import { renderToString } from '../../../renderer/src'
import { TemplateProvider, ForEach, Interpolate } from '../statement'
import { renderNode, LoopCase } from './case.helper'

const golang = new GolangTemplateFormatter()

describe('GolangTemplateFormatter#interpolate', () => {
  function formatTest(expr: Expression<any>, expected: string) {
    const result = golang.interpolate(recordExpr(expr))
    expect(result.toString()).toStrictEqual(expected)
  }

  it('should render property access correctly', () => {
    formatTest(v => v.a.b, '{{.a.b}}')
  })

  it('should render func call correctly', () => {
    formatTest(v => v.Cap(), '{{call .Cap}}')
    formatTest(v => v.Cap(v.Title), '{{call .Cap .Title}}')
    formatTest(v => v.Cap(v.Title, v.Upper(v.Name)), '{{call .Cap .Title (call .Upper .Name)}}')
    formatTest(v => v.Total(v.Upper(v.Name)), '{{call .Total (call .Upper .Name)}}')
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
      golang.loop(
        recordExpr(v => v.Names),
        Loop,
      ),
    ).toEqual(['{{range $index0, $value0 := .Names}}', Loop, '{{end}}'])
  })

  it('should correct for render child value', () => {
    expect(renderNode(golang, LoopCase.basic)).toMatchInlineSnapshot(
      `"<div>{{range $index0, $value0 := .names}}<span>{{call .foo $value0}}{{$index0}}</span>{{end}}</div>"`,
    )
  })

  it('should support nested loop', () => {
    expect(renderNode(golang, LoopCase.nested)).toMatchInlineSnapshot(
      `"<div>{{range $index0, $value0 := .names}}{{range $index1, $value1 := $value0}}{{$value1}}{{end}}{{end}}</div>"`,
    )
  })
})
