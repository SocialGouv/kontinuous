#!/usr/bin/env bash

set -a
$(dirname $0)/env.github.sh

AUTODEVOPS_PATH=${AUTODEVOPS_PATH:-"/tmp/autodevops"}
set +a