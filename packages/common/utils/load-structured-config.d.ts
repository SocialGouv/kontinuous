export type CompilerConfig = object;

export type StructuredconfigOptions = {
  configBasename?: string;
  inlineConfigs?: object[];
  configDirs?: string[];
  configPreCompilers?: CompilerConfig[];
  configOverride?: object;
  env: Record<string, string>;
  options: object;
  mergeWith?: void;
  emptyAsUndefined?: boolean;
  rootConfig: object;
  configMeta: object;
};

export type LoadStructuredConfig = (
  arg0: StructuredconfigOptions
) => Promise<Record<string, any>>;

export default LoadStructuredConfig;
