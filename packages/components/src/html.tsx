/**
 * 因为对于邮件模板来说，需要接管的东西很多，所以请使用以下组件接管
 */
import React, { HTMLAttributes, ReactElement, useContext } from 'react'
import { RendererContext } from '@remail/renderer'

export interface HTMLProps extends HTMLAttributes<HTMLHtmlElement> {}

export function HTML(props: HTMLProps) {
  const { children, ...otherProps } = props
  const { isServer } = useContext(RendererContext)

  if (isServer) {
    return (
      <html {...otherProps}>
        {children}
      </html>
    )
  } else {
    return children as ReactElement
  }
}

export interface HeadProps extends HTMLAttributes<HTMLHeadElement> {}

/**
 * IMPREOVE: support render head children in browser
 */
export function Head(props: HeadProps) {
  const { children, ...otherProps } = props
  const { isServer } = useContext(RendererContext)

  if (isServer) {
    return <head {...otherProps}>{children}</head>
  }

  console.warn('All children in Head component would be ignore in browser')

  return null
}

export interface BodyProps extends HTMLAttributes<HTMLBodyElement> {}

export function Body(props: BodyProps) {
  const { children, ...otherProps } = props
  const { isServer } = useContext(RendererContext)

  if (isServer) {
    return <body {...otherProps}>{children}</body>
  }

  console.warn(
    'Body tag do not rendered. Only some special props would be sync to document.body',
  )

  if (typeof props.className === 'string') {
    document.body.className = props.className
  }

  return children as ReactElement
}
