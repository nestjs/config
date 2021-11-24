export type NoInferType<T> = T extends unknown
  ? any
  : [T][T extends any ? 0 : never];
