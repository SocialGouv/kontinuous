type ResourceRequirements =
  import("kubernetes-models/v1").IResourceRequirements;
type Namespace = import("kubernetes-models/v1").INamespace;
type Deployment = import("kubernetes-models/apps/v1").IDeployment;
type StatefulSet = import("kubernetes-models/apps/v1").IStatefulSet;
type DaemonSet = import("kubernetes-models/apps/v1").IDaemonSet;
type Ingress = import("kubernetes-models/networking.k8s.io/v1").IIngress;
type Service = import("kubernetes-models/v1").IService;
type Job = import("kubernetes-models/batch/v1").IJob;
type CronJob = import("kubernetes-models/batch/v1").ICronJob;
type ConfigMap = import("kubernetes-models/v1").IConfigMap;
type Secret = import("kubernetes-models/v1").ISecret;

//type Utils = import("./packages/common/utils").Utils;

// todo: use officiel model
interface KappConfig {
  kind: "Config";
  apiVersion: string;
  metadata: Record<string, any>;
  spec?: Record<string, any>;
}

// todo: add sealed-secret model

declare namespace Kontinuous {
  // the Type `Manifest` doesnt exit in kubernetes-models. we define every kind of model we need.
  type Manifest =
    | Namespace
    | Deployment
    | StatefulSet
    | DaemonSet
    | Ingress
    | Service
    | Job
    | CronJob
    | KappConfig
    | ConfigMap
    | Secret;

  type Manifests = Manifest[];

  // todo: should be extract from the JS
  type RunnableManifest = Deployment | StatefulSet | DaemonSet | Job;

  type ManifestWithTemplate = RunnableManifest;

  type PatchCommonOptions = {
    surviveOnBrokenCluster?: boolean;
  };

  type PatchInitContainerOptions = PatchCommonOptions & {
    kubernetesMethod?: "serviceaccount" | "kubeconfig";
    serviceAccountName?: "default" | "kontinuous-sa";
    progressDeadlineSeconds: number;
  };

  // 20-minimize-dev-resources-requests
  type PatchMinimizeDevResourcesRequestsOptions = PatchCommonOptions & {
    requests?: ResourceRequirements["requests"];
    avoidOutOfpods?: boolean;
    avoidOutOfpodsMargin?: {
      cpu?: string | number;
      memory?: string | number;
    };
    nodeConfig?: {
      maxPods?: number;
      cpu?: string | number;
      /** something important */
      memory?: string | number;
    };
  };

  // rancher-project-id
  type PatchRancheProjectIdOptions = PatchCommonOptions & {
    rancherProjectId?: string;
  };

  // reloader
  type PatchReloaderOptions = PatchCommonOptions & {
    deploymentMode?: string;
  };

  // namespace
  type PatchNamespaceOptions = PatchCommonOptions & {
    overrideDefault?: boolean;
  };

  type SlugOptions = {
    maxLength?: number;
    partMaxLength?: number;
    glue?: string;
  };

  type PatchContext = {
    //utils: Utils;
    //@ts-ignore
    logger;
    //@ts-ignore
    kubectl;
    //@ts-ignore
    needBin?;
    // todo: extract from value-compilers
    values: {
      global: {
        namespace: string;
      };
      [key: string]: any;
    };
    // todo: automatically extract from ??
    config: {
      gitSha: string;
      gitBranch: string;
      refLabelKey: string;
      refLabelValue: string;
      deploymentLabelKey: string;
      deploymentLabelValue: string;
      deploymentEnvLabelKey: string;
      deploymentEnvLabelValue: string;
      changedPaths: string[];
      repositoryName: string;
      ciNamespace: string;
      chart: string[];
      environment: "dev" | "preprod" | "prod" | "local";
      kubeconfig: string;
      kubeconfigContext: string;
    };
  };

  // doesnt work for some reason
  // function PatchFunctionWithOptions<T>(
  //   manifests: Manifests,
  //   options: T,
  //   context?: PatchContext
  // ): Manifests;

  function PatchFunction(
    manifests: Manifests,
    options: PatchCommonOptions,
    context: PatchContext
  ): Manifests;
}

// doesnt workd :(
declare module "kubernetes-resource-parser" {
  export function cpuParser(input: string | number): number;
  export function memoryParser(input: string | number): number;
}

declare module "tiged";

declare module "slugify";
