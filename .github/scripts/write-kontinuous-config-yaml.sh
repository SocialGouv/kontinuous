#!/bin/bash

mkdir -p $HOME/.kontinuous

echo "
links:
  socialgouv/kontinuous: ${GITHUB_WORKSPACE}
" > $HOME/.kontinuous/config.yaml

echo "KUBECONFIG_B64=$(cat ~/.kube/config | base64)" >> $GITHUB_ENV