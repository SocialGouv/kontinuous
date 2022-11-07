#!/bin/bash

set -e

export MANIFESTS="$1"

JSON=$(cat "${MANIFESTS}" | npx @socialgouv/parse-manifests --json)
MARKDOWN=$(cat "${MANIFESTS}" | npx @socialgouv/parse-manifests --markdown)
TEXT=$(cat "${MANIFESTS}" | npx @socialgouv/parse-manifests --text)

echo "${TEXT}"

echo "json=$JSON" >> $GITHUB_OUTPUT
echo "markdown=$MARKDOWN" >> $GITHUB_OUTPUT
echo "text=$TEXT" >> $GITHUB_OUTPUT