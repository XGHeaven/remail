import React, { ReactElement, ReactNode } from 'react'
import { TemplateFormatter } from '../interface'
import { TemplateProvider, ForEach, Interpolate } from '../statement'

import { renderToString } from '../../../renderer/src'

export function renderNode(formatter: TemplateFormatter, node: ReactNode) {
  return renderToString(
    <TemplateProvider value={{formatter}}>
      {node}
    </TemplateProvider>
  )
}

export const LoopCase = {
  basic: (<div><ForEach
    source={v => v.names}
    render={(name, index) => (
      <span>
        <Interpolate expr={v => v.foo(name)} />
        <Interpolate expr={() => index} />
      </span>
    )}
  /></div>),
  nested: (
    <div><ForEach
              source={v => v.names}
              render={name => <ForEach source={() => name} render={char => <Interpolate expr={() => char} />} />}
            /></div>
  )
}
