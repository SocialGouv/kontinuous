#!/bin/bash

set -e

mkdir -p /tmp/.kube
echo "$KUBECONFIG" > /tmp/.kube/config
export KUBECONFIG=/tmp/.kube/config

echo "copy secret '$DB_SECRET_NAME' to '$JOB_NAMESPACE'"
kubectl get secret "$DB_SECRET_NAME" --namespace="$NAMESPACE" -ojson \
  | jq 'del(.metadata.namespace,.metadata.resourceVersion,.metadata.uid) | .metadata.creationTimestamp=null' \
  | jq '.metadata.annotations["janitor/ttl"] = "24h"' \
  | kubectl -n "$JOB_NAMESPACE" apply -f -
