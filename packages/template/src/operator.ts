import { createKit, ExpressionKitAccompanySymbol, ExpressionKit } from "./expression"

function createBinaryOperatorFunction<V>(op: string) {
  return new Function('lop', 'rop', `return lop ${op} rop`) as BinaryOperatorFunction<V>
}

function createUnaryOperatorFunction<V>(op: string) {
  return new Function('op', `return ${op}op`) as UnaryOperatorFunction<V>
}

function createSeriesOperatorFuntion<V>(op: string) {
  return new Function('num', '...nums', `
const accumulator = (acc, val) => (acc) ${op} (val);
return nums.reduce(accumulator, num);
  `.trim()) as SeriesOperatorFunction<V>
}

export type BinaryOperatorFunction<ReturnValue> = <L = any, R = any>(lop: L, rop: R) => ReturnValue
export type UnaryOperatorFunction<ReturnValue> = <O = any>(op: O) => ReturnValue
export type SeriesOperatorFunction<V> = (v: V, ...vs: V[]) => V
export type SliceOperatorFunction<V> = (v: V, start?: number, end?: number) => V

const OperatorImplement = {
  And : createSeriesOperatorFuntion<boolean>('&&'),
  Or : createSeriesOperatorFuntion<boolean>('||'),
  Not: createUnaryOperatorFunction<boolean>('!'),
  Eq : createBinaryOperatorFunction<boolean>('==='),
  Ne : createBinaryOperatorFunction<boolean>('!=='),
  Gt : createBinaryOperatorFunction<boolean>('>'),
  Lt : createBinaryOperatorFunction<boolean>('<'),
  Ge : createBinaryOperatorFunction<boolean>('>='),
  Le : createBinaryOperatorFunction<boolean>('<='),
  Add: createSeriesOperatorFuntion<number>('+'),
  Sub: createSeriesOperatorFuntion<number>('-'),
  Mul: createSeriesOperatorFuntion<number>('*'),
  Div: (num: number, den: number) => num / den,
  Mod: (num: number, den: number) => num % den,
  Inc: createUnaryOperatorFunction<number>('1 + '),
  Dec: createUnaryOperatorFunction<number>('-1 + '),
  Get: <O, K extends keyof O>(obj: O, key: K): O[K] => {
    return obj[key]
  },
  Concat: (...strs: string[]) => strs.join(''),
  Substr: (str: string, start: number, end?: number) => str.substr(start, end)
}

export const Operator = createKit() as unknown as typeof OperatorImplement

;(Operator as any as ExpressionKit)[ExpressionKitAccompanySymbol] = OperatorImplement
