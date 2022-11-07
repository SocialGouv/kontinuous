#!/bin/bash

set -e

export MANIFESTS="$1"

MARKDOWN=$(cat "${MANIFESTS}" | npx @socialgouv/parse-manifests --markdown)
TEXT=$(cat "${MANIFESTS}" | npx @socialgouv/parse-manifests --text)

echo "${TEXT}"

MARKDOWN="${MARKDOWN//$'\n'/'%0A'}"
MARKDOWN="${MARKDOWN//$'\r'/'%0D'}"
TEXT="${TEXT//$'\n'/'%0A'}"
TEXT="${TEXT//$'\r'/'%0D'}"

# https://github.com/orgs/community/discussions/26288#discussioncomment-3876281
delimiter="$(openssl rand -hex 8)"

echo "markdown=<<${delimiter}" >> $GITHUB_OUTPUT
echo "$MARKDOWN" >> $GITHUB_OUTPUT
echo "${delimiter}" >> $GITHUB_OUTPUT

echo "text=<<${delimiter}" >> $GITHUB_OUTPUT
echo "$TEXT" >> $GITHUB_OUTPUT
echo "${delimiter}" >> $GITHUB_OUTPUT