#!/bin/bash

mkdir -p ~/.kube
touch ~/.kube/config
chmod go-r ~/.kube/config
echo $KUBECONFIG_B64 | base64 -d > ~/.kube/config
export KUBECONFIG=~/.kube/config

export KS_GIT_REPOSITORY=$GITHUB_REPOSITORY

alias kontinuous="/opt/kontinuous/dist/index.js"

export KS_BUILD_PATH=/tmp/kontinuous-deploy-via-github

export KS_WORKSPACE_PATH=${KS_WORKSPACE_PATH:-"$GITHUB_WORKSPACE"}

GH_EVENT_JSON_CONFIG=$(node -e "process.stdout.write(fs.readFileSync('$GITHUB_EVENT_PATH',{encoding:'utf-8'}))")
GH_ACTION=$(node -e "process.stdout.write(($GH_EVENT_JSON_CONFIG).action || '')")

if [ "$GITHUB_EVENT_NAME" = "delete" ] || [ "$GH_ACTION" = "closed" ]; then
  export KS_EVENT=deleted
  export EVENT_REF=$(node -e "process.stdout.write(($GH_EVENT_JSON_CONFIG).ref || '')")
  export KS_GIT_BRANCH=$(node -e "const githubEvent = $GH_EVENT_JSON_CONFIG;const ref = githubEvent.pull_request?.head?.ref || githubEvent.ref || '' ;process.stdout.write(ref);")
  export KS_GIT_SHA="0000000000000000000000000000000000000000"
else
  export KS_EVENT=pushed
fi


if [ -n "$KS_DEPLOY_WRITE_OUTPUT_FILE" ]; then
  if [ "$KS_DEPLOY_WRITE_OUTPUT_FILE" = "true" ]; then
    export KS_DEPLOY_WRITE_OUTPUT_FILE="kontinuous-deployment-output.log"
  fi
  cd $GITHUB_WORKSPACE
  script -e -q -f -c "kontinuous deploy" "$KS_DEPLOY_WRITE_OUTPUT_FILE"
else
  kontinuous deploy
fi

EXIT_CODE=$?

mv "$KS_BUILD_PATH/manifests.yaml" \
   "$GITHUB_WORKSPACE/manifests.yaml"

if [ "$EXIT_CODE" != "0" ]; then
  echo "Pipeline failed ❌"
  exit 1
fi
