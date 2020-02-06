type ConfigFactoryReturnValue =
  | Record<string, any>
  | Promise<Record<string, any>>;

export type ConfigFactory<
  T extends ConfigFactoryReturnValue = ConfigFactoryReturnValue
> = () => T;
