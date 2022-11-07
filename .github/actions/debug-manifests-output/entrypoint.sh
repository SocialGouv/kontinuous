#!/bin/bash

set -e

export MANIFESTS="$1"

MARKDOWN=$(cat "${MANIFESTS}" | npx @socialgouv/parse-manifests --markdown)
TEXT=$(cat "${MANIFESTS}" | npx @socialgouv/parse-manifests --text)

echo "${TEXT}"

MARKDOWN="${MARKDOWN//$'\n'/'%0A'}"
MARKDOWN="${MARKDOWN//$'\r'/'%0D'}"

echo "DEBUG_MANIFESTS_MARKDOWN=$MARKDOWN" >> $GITHUB_ENV
