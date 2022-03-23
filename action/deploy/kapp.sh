#!/usr/bin/env bash

export REPOSITORY_NAME=${REPOSITORY##*/}
export NAMESPACE=$(cat manifests.yaml | yq eval-all 'select(.kind=="Namespace").metadata.name')

kapp \
  deploy \
  --app $REPOSITORY_NAME \
  --namespace $NAMESPACE \
  --logs-all \
  --dangerous-override-ownership-of-existing-resources \
  --yes \
  -f manifests.yaml