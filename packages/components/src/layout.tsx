/**
 * 针对邮件有如下布局方式
 * Grid/Row/Col 布局，完全模拟表格布局。
 * List/Row 基于表格布局的列表布局。
 */

import React, { HTMLAttributes, createContext, useContext } from 'react'

enum ParentType {
  None,
  Grid,
  List,
  Row,
}

export const TableContext = createContext<{
  parentType: ParentType
}>({
  parentType: ParentType.None,
})

export function TableWrapper(props: HTMLAttributes<HTMLTableElement>) {
  const { children, ...otherProps } = props
  return (
    <table {...otherProps}>
      <tbody>{children}</tbody>
    </table>
  )
}

export function Grid(props: HTMLAttributes<HTMLTableElement>) {
  const { parentType } = useContext(TableContext)

  const content = (
    <TableContext.Provider value={{ parentType: ParentType.Grid }}>
      <TableWrapper {...props} />
    </TableContext.Provider>
  )

  if (parentType === ParentType.List) {
    return <Row>{content}</Row>
  }

  if (parentType === ParentType.Grid) {
    return (
      <Row>
        <Col>{content}</Col>
      </Row>
    )
  }

  if (parentType === ParentType.Row) {
    return <Col>{content}</Col>
  }

  return content
}

export function List(props: HTMLAttributes<HTMLTableElement>) {
  const { parentType } = useContext(TableContext)

  const content = (
    <TableContext.Provider value={{ parentType: ParentType.List }}>
      <TableWrapper {...props} />
    </TableContext.Provider>
  )

  if (parentType === ParentType.Grid) {
    return (
      <Row>
        <Col>{content}</Col>
      </Row>
    )
  }

  if (parentType === ParentType.List) {
    return <Row>{content}</Row>
  }

  return content
}

interface RowProps extends HTMLAttributes<HTMLDivElement> {}

export function Row(props: RowProps) {
  const { parentType } = useContext(TableContext)

  const { children, ...otherProps } = props

  let content
  switch (parentType) {
    case ParentType.Grid:
      content = (
        <tr {...otherProps}>
          <TableContext.Provider value={{ parentType: ParentType.Row }}>{children}</TableContext.Provider>
        </tr>
      )
      break
    case ParentType.List:
      content = (
        <tr>
          <td {...otherProps}>
            <TableContext.Provider value={{ parentType: ParentType.None }}>{children}</TableContext.Provider>
          </td>
        </tr>
      )
      break
    default:
      content = (
        <List>
          <Row {...props} />
        </List>
      )
      break
  }

  return content
}

export function Col(props: HTMLAttributes<HTMLTableDataCellElement>) {
  const { children, ...otherProps } = props
  return (
    <TableContext.Provider value={{ parentType: ParentType.None }}>
      <td {...otherProps}>{props.children}</td>
    </TableContext.Provider>
  )
}
