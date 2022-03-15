#!/usr/bin/env bash

export $($(dirname $0)/env.sh)

export REPOSITORY_NAME=${REPOSITORY##*/}
export NAMESPACE=$(cat manifests.yaml | yq eval-all 'select(.kind=="Namespace").metadata.name')

$(dirname $0)/utils/need-vars.sh "REPOSITORY_NAME NAMESPACE"

kapp \
  deploy \
  --app $REPOSITORY_NAME \
  --namespace $NAMESPACE \
  --logs-all \
  --yes \
  -f manifests.yaml