#!/bin/bash

set -e

echo "copy secret '$DB_SECRET_NAME' to '$JOB_NAMESPACE'"
kubectl get secret "$DB_SECRET_NAME" --namespace="$NAMESPACE" -ojson \
  | jq 'del(.metadata.namespace,.metadata.resourceVersion,.metadata.uid) | .metadata.creationTimestamp=null' \
  | jq 'del(.metadata.managedFields,.metadata.ownerReferences)' \
  | jq '.metadata.annotations["janitor/ttl"] = "24h"' \
  | kubectl -n "$JOB_NAMESPACE" apply -f -
