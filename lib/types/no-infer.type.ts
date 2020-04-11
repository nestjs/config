export type NoInferType<T> = [T][T extends any ? 0 : never];
