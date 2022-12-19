#!/bin/bash

set -e

mkdir -p ~/.kube
touch ~/.kube/config
echo $KUBECONFIG_B64 | base64 -d > ~/.kube/config
export KUBECONFIG=~/.kube/config