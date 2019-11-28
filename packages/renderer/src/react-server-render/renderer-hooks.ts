import { Context } from 'react'

function useContext(ctx: Context<any>) {
  return (ctx as any)._currentValue
}

function createInvalidHooks(name: string) {
  return () => {
    console.warn(`Cannot use ${name} hooks`)
  }
}

export const Dispatcher = {
  readContext: createInvalidHooks('readContext'),
  useContext,
  useMemo: createInvalidHooks('useMemo'),
  useReducer: createInvalidHooks('useReducer'),
  useRef: createInvalidHooks('useRef'),
  useState: createInvalidHooks('useState'),
  useLayoutEffect: createInvalidHooks('useLayoutEffect'),
  useImperativeHandle: createInvalidHooks('useImperativeHandle'),
  useEffect: createInvalidHooks('useEffect'),
  useDebugValue: createInvalidHooks('useDebugValue'),
  useResponder: createInvalidHooks('useResponder'),
  useDeferredValue: createInvalidHooks('useDeferredValue'),
  useTransition: createInvalidHooks('useTransition'),
}
