type DependencyTreeOptions = {
  serverSide: boolean;
  validate: boolean;
  force: boolean;
  forceConflicts: boolean;
  recreate: boolean;
  applyConcurrencyLimit: number;
  surviveOnBrokenCluster: boolean;
  applyTimeout: string;
  customWaitableKinds: Kontinuous.Manifest["kind"][];
};

type DependencyTreeContext = {
  config: {
    kubeconfigContext: string;
    kubeconfig: string;
    noValidate: boolean;
    buildPath: string;
    deploymentLabelKey: string;
  };
  utils: Kontinuous.Utils;
  manifests: Kontinuous.Manifests;
  dryRun: boolean;
  kubectl: Function;
  rolloutStatus: Function;
  ctx: {
    require: (string) => any;
  };
};
