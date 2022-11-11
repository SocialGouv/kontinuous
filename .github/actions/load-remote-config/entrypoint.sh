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

echo "KONTINUOUS_CONFIG=$KONTINUOUS_CONFIG">>$GITHUB_ENV
echo "kontinuous_config=$KONTINUOUS_CONFIG">>$GITHUB_OUTPUT

# set branch after load remote config, avoid trying to get config from deleted branch
if [ "$GITHUB_EVENT_NAME" = "delete"  ]; then
  export KS_GIT_BRANCH=$(node -e "process.stdout.write(JSON.parse(fs.readFileSync('$GITHUB_EVENT_PATH')).ref)")
  DEPLOYMENT_NAME=$(get-deployment-name $KS_GIT_BRANCH)
else
  DEPLOYMENT_NAME=$(get-deployment-name)
fi

echo "DEPLOYMENT_NAME=$DEPLOYMENT_NAME">>$GITHUB_ENV
echo "deployment_name=$DEPLOYMENT_NAME">>$GITHUB_OUTPUT
