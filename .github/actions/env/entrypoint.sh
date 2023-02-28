#!/bin/bash

export KS_GIT_REPOSITORY=$GITHUB_REPOSITORY

export PATH=$PATH:/opt/kontinuous/packages/kontinuous/bin

export KS_BUILD_PATH=/tmp/kontinuous-env

export KS_WORKSPACE_PATH=${KS_WORKSPACE_PATH:-"$GITHUB_WORKSPACE"}

GH_EVENT_JSON_CONFIG=$(node -e "process.stdout.write(fs.readFileSync('$GITHUB_EVENT_PATH',{encoding:'utf-8'}))")
GH_ACTION=$(node -e "process.stdout.write(($GH_EVENT_JSON_CONFIG).action || '')")

if [ -z "$KS_GIT_BRANCH" ] && [ "$GITHUB_EVENT_NAME" = "delete" ] || [ "$GH_ACTION" = "closed" ]; then
  export KS_GIT_BRANCH=$(node -e "const githubEvent = $GH_EVENT_JSON_CONFIG;const ref = githubEvent.pull_request?.head?.ref || githubEvent.ref || '' ;process.stdout.write(ref);")
fi

echo "branch=$(kontinuous config gitBranch)">>$GITHUB_OUTPUT

echo "subdomain=$(kontinuous slug-subdomain --repository-name=$KSENV_REPOSITORY_NAME)">>$GITHUB_OUTPUT

IFS=',' read -r -a subdomain_array <<< "$KSENV_SUBDOMAIN"
for subdomain in ${subdomain_array[@]}; do
  echo "subdomain_${subdomain}=$(kontinuous slug-subdomain --repository-name=$KSENV_REPOSITORY_NAME $subdomain)">>$GITHUB_OUTPUT
done