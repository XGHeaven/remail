import { Context } from 'react'

function noop() {}

function useContext(ctx: Context<any>) {
  return (ctx as any)._currentValue
}

function useState(initial: any) {
  return [typeof initial === 'function' ? initial() : initial, () => {}]
}

function useMemo(factory: () => any, deps: any[]) {
  return factory()
}

function useRef(initial: any) {
  return {
    current: initial
  }
}

function useReducer(reducer: any, initialState: any, init: any) {
  if (typeof init === 'function') {
    return [init(initialState), () => {}]
  }
  return [initialState, () => {}]
}

export const Dispatcher = {
  readContext: useContext,
  useContext,
  useMemo,
  useReducer,
  useRef,
  useState,
  useLayoutEffect: noop,
  useImperativeHandle: noop,
  useEffect: noop,
  useDebugValue: noop,
  useResponder: noop,
  useDeferredValue: noop,
  useTransition: noop,
}
