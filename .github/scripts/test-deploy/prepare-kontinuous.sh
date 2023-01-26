#!/bin/bash

mkdir -p $HOME/.kontinuous

echo "
links:
  socialgouv/kontinuous: ${GITHUB_WORKSPACE}
" > $HOME/.kontinuous/config.yaml

echo "KUBECONFIG_B64=$(cat ~/.kube/config | base64 -w 0)" >> $GITHUB_ENV

kubectl cluster-info
kubectl version
kubectl get pods -n kube-system
kubectl create ns test-project-ci