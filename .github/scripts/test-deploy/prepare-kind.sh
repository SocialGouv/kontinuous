#!/bin/bash

echo "
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  apiServerAddress: '127.0.0.1'
  apiServerPort: 6443
" > $HOME/kind-config.yaml


kind create cluster \
  --kubeconfig $KUBECONFIG \
  --config=$HOME/kind-config.yaml

kubectl config set-cluster kind-kind --server=https://kind-control-plane:6443 