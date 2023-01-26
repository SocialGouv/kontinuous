#!/bin/bash

mkdir -p $HOME/.kontinuous

echo "
links:
  socialgouv/kontinuous: ${GITHUB_WORKSPACE}
" > $HOME/.kontinuous/config.yaml

echo "KUBECONFIG=$KUBECONFIG"
echo "KUBECONFIG_B64=$(cat ~/.kube/config | base64 -w 0)" >> $GITHUB_ENV

docker network connect kind $(cat /etc/hostname)