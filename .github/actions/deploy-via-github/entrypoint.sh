#!/bin/bash

mkdir -p ~/.kube
touch ~/.kube/config
echo $KUBECONFIG_B64 | base64 -d > ~/.kube/config
export KUBECONFIG=~/.kube/config

export KS_GIT_REPOSITORY=$GITHUB_REPOSITORY

export PATH=$PATH:/opt/kontinuous/packages/kontinuous/bin

export KS_BUILD_PATH=/tmp/kontinuous-deploy-via-github/

kontinuous deploy
EXIT_CODE=$?

mv "$KS_BUILD_PATH/manifests.yaml" \
   "$GITHUB_WORKSPACE/manifests.yaml"

exit $EXIT_CODE