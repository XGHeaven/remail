import { createContext } from 'react'

export const RendererContext = createContext({
  isServer: false,
})
