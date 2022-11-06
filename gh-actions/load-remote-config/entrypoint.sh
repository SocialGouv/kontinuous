#!/bin/bash

set -e

export PATH=$PATH:/opt/kontinuous/packages/kontinuous/bin

export KS_GIT_REPOSITORY=$GITHUB_REPOSITORY

export KONTINUOUS_CONFIG=$GITHUB_WORKSPACE/kontinuous-config.json

kontinuous config --remote --format json>$KONTINUOUS_CONFIG

DEPLOYMENT_ID=get-deployment-id

echo "KONTINUOUS_CONFIG=$KONTINUOUS_CONFIG">>$GITHUB_ENV
echo "DEPLOYMENT_ID=$DEPLOYMENT_ID">>$GITHUB_ENV

echo "kontinuous_config=$KONTINUOUS_CONFIG">>$GITHUB_OUTPUT
echo "deployment_id=$DEPLOYMENT_ID">>$GITHUB_OUTPUT