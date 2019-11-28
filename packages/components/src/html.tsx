/**
 * 因为对于邮件模板来说，需要接管的东西很多，所以请使用以下组件接管
 */
import React, { HTMLAttributes, ReactElement, Children, isValidElement, useContext, useEffect } from 'react'
import { RendererContext } from '@remail/renderer'

export interface HTMLProps extends HTMLAttributes<HTMLHtmlElement> {}

export function HTML(props: HTMLProps) {
  const { children, ...otherProps } = props
  const { isServer } = useContext(RendererContext)
  let head: ReactElement | null = null
  let body: ReactElement | null = null

  Children.forEach(children, child => {
    if (isValidElement(child)) {
      if (child.type === Body && !body) {
        body = child
      } else if (child.type === Head && !head) {
        head = child
      }
    }
  })

  if (isServer) {
    return (
      <html {...otherProps}>
        {head}
        {body}
      </html>
    )
  } else {
    return body
  }
}

export interface HeadProps extends HTMLAttributes<HTMLHeadElement> {}

export function Head(props: HeadProps) {
  const { children, ...otherProps } = props
  const { isServer } = useContext(RendererContext)

  if (isServer) {
    return <head {...otherProps}>{children}</head>
  }

  console.log('All children in Head would be ignore')

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
    'Body would directly render element to document.body. You will receive react-dom warning about this, Please ignore it',
  )

  return children as ReactElement
}
