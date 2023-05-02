#!/bin/bash

set -e

git config --global --add safe.directory $GITHUB_WORKSPACE

export TRIGGER_WEBHOOK=${TRIGGER_WEBHOOK:-"true"}

KS_GIT=false

if [ -n "$GITHUB_HEAD_REF" ]; then
  KS_GIT_BRANCH=$GITHUB_HEAD_REF
else
  KS_GIT_BRANCH=$GITHUB_REF
fi
KS_GIT_BRANCH=${KS_GIT_BRANCH#refs/heads/}
KS_GIT_BRANCH=${KS_GIT_BRANCH#refs/tags/}

KS_GIT_BRANCH_URLENCODED=$(echo $KS_GIT_BRANCH | sed 's/\//\%2f/g')

KS_GIT_REPOSITORY=$GITHUB_REPOSITORY
KS_GIT_REPOSITORY_URLENCODED=$(echo $KS_GIT_REPOSITORY | sed 's/\//\%2f/g')

KS_GIT_SHA=$GITHUB_SHA
KS_DEBUG=true

GH_EVENT_JSON_CONFIG=$(node -e "process.stdout.write(fs.readFileSync('$GITHUB_EVENT_PATH',{encoding:'utf-8'}))")
GH_ACTION=$(node -e "process.stdout.write(($GH_EVENT_JSON_CONFIG).action || '')")

if [ "$GITHUB_EVENT_NAME" = "delete" ] || [ "$GH_ACTION" = "closed" ]; then
  KS_EVENT=deleted
  export KS_GIT_BRANCH=$(node -e "const githubEvent = $GH_EVENT_JSON_CONFIG;const ref = githubEvent.pull_request?.head?.ref || githubEvent.ref || '' ;process.stdout.write(ref);")
  KS_GIT_BRANCH_URLENCODED=$(echo $KS_GIT_BRANCH | sed 's/\//\%2f/g')
  KS_GIT_SHA="0000000000000000000000000000000000000000"
else
  KS_EVENT=pushed
fi

export KS_DEFAULT_BRANCH=$(node -e "process.stdout.write(($GH_EVENT_JSON_CONFIG).repository?.default_branch || '')")

export KS_GIT
export KS_GIT_BRANCH
export KS_GIT_SHA
export KS_GIT_REPOSITORY
export KS_EVENT
export KS_DEBUG

mkdir -p .kontinuous
kontinuous config --remote --format json>.kontinuous/config.yaml

KONTINUOUS_JSON_CONFIG=$(node -e "process.stdout.write(fs.readFileSync('.kontinuous/config.yaml',{encoding:'utf-8'}))")

export KS_ENVIRONMENT=$(node -e "process.stdout.write(($KONTINUOUS_JSON_CONFIG).environment || '')")
KS_WEBHOOK_URI=$(node -e "process.stdout.write(($KONTINUOUS_JSON_CONFIG).webhookUri || '')")
KS_PROJECT_NAME=$(node -e "process.stdout.write(($KONTINUOUS_JSON_CONFIG).projectName || '')")
KS_WEBHOOK_SERVICE_ACCOUNT_NAME=$(node -e "process.stdout.write(($KONTINUOUS_JSON_CONFIG).webhhookServiceAccountName || '')")
KS_WEBHOOK_MOUNT_KUBECONFIG=$(node -e "process.stdout.write(($KONTINUOUS_JSON_CONFIG).webhookMountKubeconfig || '')")
KS_WEBHOOK_MOUNT_SECRETS=$(node -e "process.stdout.write(($KONTINUOUS_JSON_CONFIG).webhhookMountSecrets?.join(',') || '')")

echo "env=$KS_ENVIRONMENT">>$GITHUB_OUTPUT

echo "KS_ENVIRONMENT=$KS_ENVIRONMENT">>$GITHUB_ENV
echo "KS_PROJECT_NAME=$KS_PROJECT_NAME">>$GITHUB_ENV
echo "KS_WEBHOOK_URI=$KS_WEBHOOK_URI">>$GITHUB_ENV
echo "KS_WEBHOOK_TOKEN=$KS_WEBHOOK_TOKEN">>$GITHUB_ENV
echo "KS_GIT=$KS_GIT">>$GITHUB_ENV
echo "KS_GIT_BRANCH=$KS_GIT_BRANCH">>$GITHUB_ENV
echo "KS_GIT_BRANCH_URLENCODED=$KS_GIT_BRANCH_URLENCODED">>$GITHUB_ENV
echo "KS_GIT_SHA=$KS_GIT_SHA">>$GITHUB_ENV
echo "KS_GIT_REPOSITORY=$KS_GIT_REPOSITORY">>$GITHUB_ENV
echo "KS_GIT_REPOSITORY_URLENCODED=$KS_GIT_REPOSITORY_URLENCODED">>$GITHUB_ENV
echo "KS_EVENT=$KS_EVENT">>$GITHUB_ENV
echo "KS_DEBUG=$KS_DEBUG">>$GITHUB_ENV

echo "KS_CHART=$KS_CHART">>$GITHUB_ENV
echo "KS_IGNORE_PROJECT_TEMPLATES=$KS_IGNORE_PROJECT_TEMPLATES">>$GITHUB_ENV

if [ -n "$TRIGGER_WEBHOOK" ] && [ "$TRIGGER_WEBHOOK" != "false" ] || [ "$GITHUB_RUN_ATTEMPT" -gt "1" ]; then
  if [ "$GITHUB_RUN_ATTEMPT" -gt "1" ]; then
    echo "Trigger webhook from action for rerun attempt #${GITHUB_RUN_ATTEMPT}"
  else
    echo "Trigger webhook from action"
  fi
  URI="${KS_WEBHOOK_URI}/api/v1/oas/hooks/user?project=${KS_PROJECT_NAME}&event=${KS_EVENT}&env=${KS_ENVIRONMENT}"
  if [ "$KS_CHART" != "" ]; then
    URI="${URI}&chart=${KS_CHART}"
  fi
  if [ "$KS_IGNORE_PROJECT_TEMPLATES" != "" ]; then
    URI="${URI}&ignoreProjectTemplates=${KS_IGNORE_PROJECT_TEMPLATES}"
  fi
  if [ "$KS_WEBHOOK_SERVICE_ACCOUNT_NAME" != "" ]; then
    URI="${URI}&serviceAccountName=${KS_WEBHOOK_SERVICE_ACCOUNT_NAME}"
  fi
  if [ "$KS_WEBHOOK_MOUNT_KUBECONFIG" != "" ]; then
    URI="${URI}&mountKubeconfig=${KS_WEBHOOK_MOUNT_KUBECONFIG}"
  fi
  if [ "$KS_WEBHOOK_MOUNT_SECRETS" != "" ]; then
    URI="${URI}&mountSecrets=${KS_WEBHOOK_MOUNT_SECRETS}"
  fi
  KONTINUOUS_VERSION=$(cat /kontinuousVersion | awk -F: '{print $NF}' | tr -d '\n')
  URI="${URI}&kontinuousVersion=${KONTINUOUS_VERSION}"
  wget --content-on-error -qO- \
    --header="Authorization: Bearer ${KS_WEBHOOK_TOKEN}" \
    --header='Content-Type:application/json' \
    --post-data "{\"repositoryUrl\":\"${KS_GIT_REPOSITORY}\",\"ref\":\"${KS_GIT_BRANCH}\",\"commit\":\"${KS_GIT_SHA}\"}" \
    "$URI"
  echo ""
fi

if [ -n "$KS_DEPLOY_WRITE_OUTPUT_FILE" ]; then
  if [ "$KS_DEPLOY_WRITE_OUTPUT_FILE" = "true" ]; then
    export KS_DEPLOY_WRITE_OUTPUT_FILE="kontinuous-deployment-output.log"
  fi
  cd $GITHUB_WORKSPACE
  script -e -q -f -c "kontinuous logs" "$KS_DEPLOY_WRITE_OUTPUT_FILE"
else
  kontinuous logs
fi

kontinuous download manifests manifests.yaml

wget --content-on-error -q \
  --header="Authorization: Bearer ${KS_WEBHOOK_TOKEN}" \
  -O deployment-status.json \
  "${KS_WEBHOOK_URI}/api/v1/oas/artifacts/status?project=${KS_PROJECT_NAME}&repository=${KS_GIT_REPOSITORY_URLENCODED}&branch=${KS_GIT_BRANCH_URLENCODED}&commit=${KS_GIT_SHA}"

DEPLOYMENT_STATUS=$(cat deployment-status.json)
status=$(echo "$DEPLOYMENT_STATUS" | jq .status)
echo "status:  $status"

DEPLOYMENT_OK=$(echo "$DEPLOYMENT_STATUS" | jq .ok)

if [ "$DEPLOYMENT_OK" != "true" ]; then
  echo "Pipeline failed ❌"
  exit 1
fi