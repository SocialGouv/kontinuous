#!/bin/bash
set -e

export ROOT_WORKSPACE_PATH="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
export KUBEWORKFLOW_PATH=$(dirname $ROOT_WORKSPACE_PATH)

export AUTODEVOPS_PATH="/tmp/autodevops"

shopt -s globstar
for dir in $ROOT_WORKSPACE_PATH/*; do
  [ -d "$dir" ] || continue
  export WORKSPACE_PATH="$dir"
  if [ -f "$WORKSPACE_PATH/.env" ]; then
    source "$WORKSPACE_PATH/.env"
  fi
  $KUBEWORKFLOW_PATH/dev-local.sh
  cp $AUTODEVOPS_PATH/manifests.yaml $WORKSPACE_PATH/manifests.yaml.snap
done

for dir in $ROOT_WORKSPACE_PATH/*; do
  [ -f "$dir/manifests.yaml.snap" ] || continue
  echo "Snapshot: $dir/manifests.yaml.snap"
done