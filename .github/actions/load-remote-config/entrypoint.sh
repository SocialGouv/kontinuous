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
if [ "$GITHUB_EVENT_NAME" = "delete"  ]; then
  KS_EVENT=deleted  
  export EVENT_REF=$(node -e "process.stdout.write(JSON.parse(fs.readFileSync('$GITHUB_EVENT_PATH')).ref)")
  KS_GIT_BRANCH="$EVENT_REF"
  KS_GIT_BRANCH_URLENCODED=$(echo $KS_GIT_BRANCH | sed 's/\//\%2f/g')
  KS_GIT_SHA="0000000000000000000000000000000000000000"
else
  KS_EVENT=pushed
fi

export KS_GIT_BRANCH

export KONTINUOUS_CONFIG=$GITHUB_WORKSPACE/kontinuous-config.json
kontinuous config --remote --format json>$KONTINUOUS_CONFIG
echo "KONTINUOUS_CONFIG=$KONTINUOUS_CONFIG">>$GITHUB_ENV
echo "kontinuous_config=$KONTINUOUS_CONFIG">>$GITHUB_OUTPUT


if [ "$GITHUB_EVENT_NAME" != "delete"  ]; then
  DEPLOYMENT_NAME=$(get-deployment-name)
else
  DEPLOYMENT_NAME=$(get-deployment-name "$KS_GIT_BRANCH")
fi

echo "DEPLOYMENT_NAME=$DEPLOYMENT_NAME">>$GITHUB_ENV
echo "deployment_name=$DEPLOYMENT_NAME">>$GITHUB_OUTPUT
