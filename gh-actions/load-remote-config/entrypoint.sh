#!/bin/bash

set -e

export PATH=$PATH:/opt/kontinuous/packages/kontinuous/bin

export KS_GIT=false
export KS_GIT_REPOSITORY=$GITHUB_REPOSITORY
if [ -n "$GITHUB_HEAD_REF" ]; then
  KS_GIT_BRANCH=$GITHUB_HEAD_REF
else
  KS_GIT_BRANCH=$GITHUB_REF
fi
KS_GIT_BRANCH=${KS_GIT_BRANCH#refs/heads/}
KS_GIT_BRANCH=${KS_GIT_BRANCH#refs/tags/}
export KS_GIT_BRANCH

export KONTINUOUS_CONFIG=$GITHUB_WORKSPACE/kontinuous-config.json

kontinuous config --remote --format json>$KONTINUOUS_CONFIG

DEPLOYMENT_ID=$(get-deployment-id)

echo "KONTINUOUS_CONFIG=$KONTINUOUS_CONFIG">>$GITHUB_ENV
echo "DEPLOYMENT_ID=$DEPLOYMENT_ID">>$GITHUB_ENV

echo "kontinuous_config=$KONTINUOUS_CONFIG">>$GITHUB_OUTPUT
echo "deployment_id=$DEPLOYMENT_ID">>$GITHUB_OUTPUT