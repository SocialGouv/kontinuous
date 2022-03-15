#!/usr/bin/env bash

set -a
$(dirname $0)/env.sh
set +a

REPOSITORY_NAME=${REPOSITORY##*/}

$(dirname $0)/utils/need-vars.sh "REPOSITORY_NAME"

kapp \
  deploy \
  --app $REPOSITORY_NAME \
  --logs-all \
  --yes \
  -f manifests.yaml