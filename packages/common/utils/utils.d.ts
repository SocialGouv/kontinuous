import { ChildProcessWithoutNullStreams } from "child_process";

import { NodeClient as SentryNodeClient } from "@sentry/node";

type RolloutStatusCommonParams = {
  kubeconfig: string;
  kubecontext: string;
  namespace: string;
  selector: string;
  kindFilter: string;
  pendingDeadLineSeconds: number;
  ignoreSecretNotFound: boolean;
  abortSignal: AbortSignal;
};

type RolloutStatusExecParams = RolloutStatusCommonParams & {
  intervalSeconds?: number;
};

type RolloutStatusParams = RolloutStatusCommonParams & {
  logger?: Kontinuous.Utils["logger"];
  retryErrImagePull: boolean;
  surviveOnBrokenCluster: boolean;
  retries: number;
  sentry: SentryNodeClient;
};

type ErrorResult = {
  error: { code: string; message: string };
};

type RolloutStatusExec = (arg0: RolloutStatusExecParams) => {
  process: ChildProcessWithoutNullStreams;
  promise: Promise<object | ErrorResult>;
};

type RolloutStatus = (arg0: RolloutStatusParams) => {
  //process: ChildProcessWithoutNullStreams;
  //promise: Promise<object | ErrorResult>;
};
