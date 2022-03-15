#!/bin/bash
set -e

export WORKSPACE_PATH="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
export KUBEWORKFLOW_PATH=$(dirname $WORKSPACE_PATH)

export AUTODEVOPS_PATH="/tmp/autodevops"

$KUBEWORKFLOW_PATH/dev-local.sh

cp $AUTODEVOPS_PATH/manifests.yaml $WORKSPACE_PATH/manifests.yaml.snap

echo "Snapshot: $WORKSPACE_PATH/manifests.yaml.snap"