import { ExpressionRecord, ExpressionKit } from './expression'
import { ReactNode } from 'react'

export interface TemplateFormatter {
  interpolate: (record: ExpressionRecord) => string
  condition: (record: ExpressionRecord, $then: ReactNode, $else?: ReactNode) => ReactNode[]
  loop: (
    record: ExpressionRecord,
    body: (kit: ExpressionKit, index: ExpressionKit) => ReactNode,
    level?: number,
  ) => ReactNode[]
}
