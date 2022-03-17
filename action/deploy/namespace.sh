#!/usr/bin/env bash
set -e

export NAMESPACE=$(cat manifests.yaml | yq eval-all 'select(.kind=="Namespace").metadata.name')

namespaceStatus=$(kubectl get ns $NAMESPACE -o json | jq .status.phase -r)
if [ "$namespaceStatus" == "Active" ]; then
  exit 0
fi

cat manifests.yaml | yq eval 'select(.kind=="Namespace")' - > namespace.yaml

kubectl create -f namespace.yaml>/dev/null 2>&1 || true

# wait for namespace to be ready
n=0
until [ "$n" -ge 10 ]; do
  namespaceStatus=$(kubectl get ns $NAMESPACE -o json | jq .status.phase -r)
  [ $namespaceStatus == "Active" ] && break
  n=$((n+1))
  sleep 1
done

echo "namespace '$NAMESPACE' is ready"