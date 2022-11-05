#!/bin/bash

export MANIFESTS="$1"

JSON=$(cat "${MANIFESTS}" | npx @socialgouv/parse-manifests --json)
MARKDOWN=$(cat "${MANIFESTS}" | npx @socialgouv/parse-manifests --markdown)
TEXT=$(cat "${MANIFESTS}" | npx @socialgouv/parse-manifests --text)

echo "${TEXT}"

JSON="${JSON//$'\n'/'%0A'}"
JSON="${JSON//$'\r'/'%0D'}"
MARKDOWN="${MARKDOWN//$'\n'/'%0A'}"
MARKDOWN="${MARKDOWN//$'\r'/'%0D'}"
TEXT="${TEXT//$'\n'/'%0A'}"
TEXT="${TEXT//$'\r'/'%0D'}"

echo "json=$JSON" >> $GITHUB_OUTPUT
echo "markdown=$MARKDOWN" >> $GITHUB_OUTPUT
echo "text=$TEXT" >> $GITHUB_OUTPUT