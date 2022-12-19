#!/bin/bash

mkdir -p ~/.kube
touch ~/.kube/config
echo $KUBECONFIG_B64 | base64 -d > ~/.kube/config
export KUBECONFIG=~/.kube/config

export KS_GIT_REPOSITORY=$GITHUB_REPOSITORY

export PATH=$PATH:/opt/kontinuous/packages/kontinuous/bin

export KS_BUILD_PATH=/tmp/kontinuous-deploy-via-github/

export KS_WORKSPACE_PATH=${KS_WORKSPACE_PATH:-"$GITHUB_WORKSPACE"}

kontinuous deploy
EXIT_CODE=$?

mv "$KS_BUILD_PATH/manifests.yaml" \
   "$GITHUB_WORKSPACE/manifests.yaml"

if [ "$EXIT_CODE" = "0" ]; then
  DEPLOYMENT_OK="true"
else
  DEPLOYMENT_OK="false"
fi
echo "deploymentOk=$DEPLOYMENT_OK">>$GITHUB_OUTPUT

if [ "$DEPLOYMENT_OK" != "true" ]; then
  echo "Pipeline failed ❌"
  exit 1
fi