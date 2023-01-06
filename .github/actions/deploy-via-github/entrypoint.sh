#!/bin/bash

mkdir -p ~/.kube
touch ~/.kube/config
echo $KUBECONFIG_B64 | base64 -d > ~/.kube/config
export KUBECONFIG=~/.kube/config

export KS_GIT_REPOSITORY=$GITHUB_REPOSITORY

export PATH=$PATH:/opt/kontinuous/packages/kontinuous/bin

export KS_BUILD_PATH=/tmp/kontinuous-deploy-via-github

export KS_WORKSPACE_PATH=${KS_WORKSPACE_PATH:-"$GITHUB_WORKSPACE"}

if [ -n "$KS_DEPLOY_WRITE_OUTPUT_FILE" ]; then
  cd $GITHUB_WORKSPACE
  script -q -c "kontinuous deploy" | tee "$KS_DEPLOY_WRITE_OUTPUT_FILE"
else
  kontinuous deploy
fi

EXIT_CODE=$?

mv "$KS_BUILD_PATH/manifests.yaml" \
   "$GITHUB_WORKSPACE/manifests.yaml"

if [ "$EXIT_CODE" != "0" ]; then
  echo "Pipeline failed ❌"
  exit 1
fi
