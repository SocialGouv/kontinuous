#!/bin/bash

set -e

MANDATORY_VARS="GITHUB_TOKEN GITHUB_USERNAME"
for VAR in $MANDATORY_VARS; do
  if [[ -z "${!VAR}" ]]; then
    echo "${VAR} environment variable is empty"
    exit 1
  fi
done

GITHUB_ORG=${GITHUB_ORG:-SocialGouv}
GITHUB_REPO=${GITHUB_REPO:-manifests}

export GITHUB_REPO_PUBLIC_KEY=$(curl -s -H "authorization: Bearer $GITHUB_TOKEN" https://api.github.com/repos/${GITHUB_ORG}/${GITHUB_REPO}/actions/secrets/public-key)
export BASE64_ENCODED_PUBLIC_KEY=$(echo $GITHUB_REPO_PUBLIC_KEY | jq -r .key)
GITHUB_REPO_PUBLIC_KEY_ID=$(echo $GITHUB_REPO_PUBLIC_KEY | jq -r .key_id)

KUBECONTEXT=${KUBECONTEXT:-prod}
NAMESPACES=$(kubectl --context $KUBECONTEXT get namespaces -o name)
for nsressource in $NAMESPACES; do
  if [[ "$nsressource" =~ ^namespace/webhook-.* ]]; then
    namespace=${nsressource#*namespace/}
    secret=$(kubectl --context $KUBECONTEXT -n $namespace get secrets kubewebhook -o json)
    token=$(echo $secret | jq -r ".data.KUBEWEBHOOK_TOKEN" | base64 -d)
    if [ ! -z "$token" ]; then
      encryptedToken=$(echo "$token" | ./encrypt-secret-for-github-api.js)
      projectName=${namespace#*webhook-}
      projectName=${projectName^^}
      projectName=$(echo "$projectName" | sed "s/[^[:alnum:]_]//g")
      secretName="KUBEWEBHOOK_TOKEN_${projectName}"
      echo "providing secret ${secretName} to ${GITHUB_ORG}/${GITHUB_REPO}"
      curl \
        -X PUT \
        -H "Accept: application/vnd.github.v3+json" \
        -u "$GITHUB_USERNAME:$GITHUB_TOKEN" \
        https://api.github.com/repos/${GITHUB_ORG}/${GITHUB_REPO}/actions/secrets/${secretName} \
        -d '{"encrypted_value":"'${encryptedToken}'","key_id": "'${GITHUB_REPO_PUBLIC_KEY_ID}'"}'      
    fi
  fi
done

echo "done"