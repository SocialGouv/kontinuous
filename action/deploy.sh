#!/usr/bin/env bash
set -e
$(dirname $0)/create-namespace.sh
$(dirname $0)/deploy-kapp.sh