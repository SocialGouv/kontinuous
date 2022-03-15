#!/usr/bin/env bash

export $($(dirname $0)/env.sh)

REPOSITORY_NAME=${REPOSITORY##*/}

$(dirname $0)/utils/need-vars.sh "REPOSITORY_NAME"

kapp \
  deploy \
  --app $REPOSITORY_NAME \
  --logs-all \
  --yes \
  -f manifests.yaml