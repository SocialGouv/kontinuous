#!/bin/bash

# set -e

KUBECONTEXT=${KUBECONTEXT:-prod}
NAMESPACES=$(kubectl --context $KUBECONTEXT get namespaces -o name)
for nsressource in $NAMESPACES; do
  if [[ "$nsressource" =~ ^namespace/webhook-.* ]]; then
    namespaceWebhook=${nsressource#*namespace/}
    projectName=${namespaceWebhook#*webhook-}
    namespaceCi="${projectName}-ci"
    
    echo "copy secret 'kubewebhook' from '$namespaceWebhook' to 'dev'.'$namespaceCi'"
    kubectl --context $KUBECONTEXT get secret "kubewebhook" --namespace="$namespaceWebhook" -ojson \
      | jq 'del(.metadata.namespace,.metadata.resourceVersion,.metadata.uid) | .metadata.creationTimestamp=null' \
      | jq 'del(.metadata.managedFields,.metadata.ownerReferences)' \
      | kubectl --context dev -n "$namespaceCi" apply -f -      

    echo "copy secret 'kubewebhook' from '$namespaceWebhook' to 'prod'.'$namespaceCi'"
    kubectl --context $KUBECONTEXT get secret "kubewebhook" --namespace="$namespaceWebhook" -ojson \
      | jq 'del(.metadata.namespace,.metadata.resourceVersion,.metadata.uid) | .metadata.creationTimestamp=null' \
      | jq 'del(.metadata.managedFields,.metadata.ownerReferences)' \
      | kubectl --context prod -n "$namespaceCi" apply -f -      
  fi
done

echo "done"