#!/usr/bin/env bash

NEED_VARS="$1"
for VAR in $NEED_VARS; do
  if [[ -z "${!VAR}" ]]; then
    echo "FATAL ERROR: required ${VAR} environment variable is empty"
    exit 1
  fi
done