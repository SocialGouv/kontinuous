export type DestinationNamespace = string | null;
export type DefaultHostname = string | null;
export type ServicePort = ServicePort1 & ServicePort2;
export type ServicePort1 = number;
export type ServicePort2 = string;
export type IngressSSLCertName = string | null;
export type HelmRepositoryName = string | null;
export type NumberOfReplicas = NumberOfReplicas1 & NumberOfReplicas2;
export type NumberOfReplicas1 = number;
export type NumberOfReplicas2 = string;
export type ExtraStartupArguments = unknown[];
/**
 * To clean some old mails when persistence is enabled
 */
export type EnableCronCleanups = boolean | null;
export type CleanupSchedule = string;
export type Retention = Retention1 & Retention2;
export type Retention1 = number;
export type Retention2 = string;
export type EnableIngress = EnableIngress1 & EnableIngress2;
export type EnableIngress1 = boolean;
export type EnableIngress2 = string;

// helm schema
export interface MailDevSchema {
  namespace?: DestinationNamespace;
  host?: DefaultHostname;
  servicePort?: ServicePort;
  certSecretName?: IngressSSLCertName;
  repositoryName?: HelmRepositoryName;
  replicaCount?: NumberOfReplicas;
  image?: DockerImage;
  extraArgs?: ExtraStartupArguments;
  persistence?: PersistenceConfig;
  /**
   * To clean some old mails when persistence is enabled
   */
  cron?: {
    enabled?: boolean | null;
    image?: DockerImage1;
    schedule?: CleanupSchedule;
    daysToKeep?: Retention;
    [k: string]: unknown;
  };
  ingress?: {
    enabled?: EnableIngress;
    annotations?: IngressAnnotation;
    [k: string]: unknown;
  };
  resources?: CPUMemoryResourceRequestsLimits;
}
export interface DockerImage {
  repository?: string;
  pullPolicy?: string;
  tag?: string;
}
export interface PersistenceConfig {
  enabled?: boolean | null;
  accessMode?: string;
  size?: string;
  storageClass?: string;
  existingClaim?: string;
  mountPath?: string;
}
export interface DockerImage1 {
  repository?: string;
  pullPolicy?: string;
  tag?: string;
}
export interface IngressAnnotation {
  // TODO : use json-schema / nginx
  [k: string]: unknown;
}
/**
 * ResourceRequirements describes the compute resource requirements.
 */
export interface CPUMemoryResourceRequestsLimits {
  /**
   * Limits describes the maximum amount of compute resources allowed. More info: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
   */
  limits?: {
    [k: string]: string | number;
  };
  /**
   * Requests describes the minimum amount of compute resources required. If Requests is omitted for a container, it defaults to Limits if that is explicitly specified, otherwise to an implementation-defined value. More info: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
   */
  requests?: {
    [k: string]: string | number;
  };
  [k: string]: unknown;
}
