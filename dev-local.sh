#!/usr/bin/env bash
set -e

export WORKSPACE_PATH=${WORKSPACE_PATH:-"$PWD"}
export REPOSITORY=${REPOSITORY:-"SocialGouv/$(basename $WORKSPACE_PATH)"}
export KUBEWORKFLOW_PATH=${KUBEWORKFLOW_PATH:-"$(dirname $0)"}
export GIT_REF=${GIT_REF:-"refs/heads/feature-branch-1"}
export GIT_SHA=${GIT_SHA-"ffac537e6cbbf934b08745a378932722df287a53"}
export ENVIRONMENT=${ENVIRONMENT:-"dev"}
export RANCHER_PROJECT_ID=${RANCHER_PROJECT_ID:-"1234"}
export RANCHER_PROJECT_NAME=${RANCHER_PROJECT_NAME:-"awesome"}

$KUBEWORKFLOW_PATH/action/build.sh 2> >(grep -v 'found symbolic link' >&2)
