#!/usr/bin/env bash

export REPOSITORY_NAME=${REPOSITORY##*/}
export NAMESPACE=$(cat manifests.yaml | yq eval-all 'select(.kind=="Namespace").metadata.name')

kapp \
  deploy \
  --app $REPOSITORY_NAME \
  --namespace $NAMESPACE \
  --logs-all \
  --yes \
  -f manifests.yaml