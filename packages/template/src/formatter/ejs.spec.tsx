import React from 'react'
import { EjsTemplateFormatter } from './ejs'
import { recordExpr, Expression } from '../expression'
import { renderToString } from '../../../renderer/src'
import { renderNode, LoopCase } from './case.helper'

describe('EjsTemplateFormatter#interpolate', () => {
  const ejs = new EjsTemplateFormatter()

  function formatTest(expr: Expression<any>, expected: string) {
    const result = ejs.interpolate(recordExpr(expr))
    expect(result).toStrictEqual(`<%= ${expected} %>`)
  }

  it('should correct when render property access chain', () => {
    formatTest(v => v.a.b.c, 'a.b.c')
  })

  it('should correct for function call', () => {
    formatTest(v => v.a.b(), 'a.b()')
  })

  it('should render function call with args', () => {
    formatTest(v => v.plus(v.a, v.b.c), 'plus(a, b.c)')
  })

  it('should correct format for primary value', () => {
    formatTest(v => v.add(1, 2), 'add(1, 2)')
  })

  it('should correct with object value', () => {
    formatTest(v => v.get({ a: 1 }, 'a'), 'get({"a":1}, "a")')
  })

  it('should output raw string', () => {
    expect(renderToString(<i>{ejs.interpolate(recordExpr(v => v.a))}</i>)).toBe('<i><%= a %></i>')
  })
})

describe('EjsTemplateFormatter#condition', () => {
  const ejs = new EjsTemplateFormatter()
  const Then = 'then'
  const Else = 'else'

  function test(condition: Expression<any>, expected: any[], hasElse: boolean = false) {
    const result = ejs.condition(recordExpr(condition)!, Then, hasElse ? Else : undefined)
    expect(result).toEqual(expected)
  }

  it('should support basic if statement', () => {
    test(v => v.a, ['<% if (a) { %>', Then, '<% } %>'])
    test(v => v.a, ['<% if (a) { %>', Then, '<% } else { %>', Else, '<% } %>'], true)
  })

  it('should output raw string', () => {
    expect(
      renderToString(
        <i>
          {ejs.condition(
            recordExpr(v => v.a),
            Then,
          )}
        </i>,
      ),
    ).toBe(`<i><% if (a) { %>${Then}<% } %></i>`)
  })
})

describe('EjsTemplateFormatter#loop', () => {
  const ejs = new EjsTemplateFormatter()
  function test(source: Expression<any>, body: any, expected: any[], level: number = 0) {
    const ret = ejs.loop(recordExpr(source), body, level)
    expect(ret).toEqual(expected)
  }

  it('should correct for basic usage', () => {
    test(v => v.users, 'users', ['<% users.forEach(function(item0, index0, source0) { %>', 'users', '<% }) %>'])
  })

  it('should correct for array object', () => {
    test(v => [1, 2, 3], 'users', ['<% [1,2,3].forEach(function(item0, index0, source0) { %>', 'users', '<% }) %>'])
  })

  it('should output raw string', () => {
    expect(
      renderToString(
        <i>
          {ejs.loop(
            recordExpr(v => v.a),
            'users',
          )}
        </i>,
      ),
    ).toMatchInlineSnapshot(`"<i><% a.forEach(function(item0, index0, source0) { %>users<% }) %></i>"`)
  })

  it('should correct render child value', () => {
    expect(
      renderNode(ejs, LoopCase.basic)
    ).toMatchInlineSnapshot(
      `"<div><% names.forEach(function(item0, index0, source0) { %><span><%= foo(item0) %><%= index0 %></span><% }) %></div>"`,
    )
  })

  it('should correct render nest loop', () => {
    expect(
      renderNode(ejs, LoopCase.nested)
    ).toMatchInlineSnapshot(
      `"<div><% names.forEach(function(item0, index0, source0) { %><% item0.forEach(function(item1, index1, source1) { %><%= item1 %><% }) %><% }) %></div>"`,
    )
  })
})
