#!/bin/bash

mkdir -p $HOME/.kontinuous

echo "
links:
  socialgouv/kontinuous: ${GITHUB_WORKSPACE}
" > $HOME/.kontinuous/config.yaml

echo "KUBECONFIG_B64=$(cat ~/.kube/config | base64 -w 0)" >> $GITHUB_ENV



echo "
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  apiServerAddress: '127.0.0.1'
  apiServerPort: 6443
" > $HOME/kind-config.yaml

export KIND_EXPERIMENTAL_DOCKER_NETWORK=${{ job.container.network }}

kind create cluster \
  --kubeconfig $KUBECONFIG \
  --config=$HOME/kind-config.yaml

kubectl config set-cluster kind-kind --server=https://kind-control-plane:6443 




docker network connect kind $(cat /etc/hostname)

kubectl cluster-info
kubectl version
kubectl get pods -n kube-system
kubectl create ns test-project-ci