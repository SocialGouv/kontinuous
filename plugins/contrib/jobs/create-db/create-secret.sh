#!/bin/bash

set -e

if [ -n "$(kubectl -n $NAMESPACE get secret $DB_SECRET_NAME 2>/dev/null)" ]; then
  echo "secret named '$DB_SECRET_NAME' already exists in namespace '$NAMESPACE'"
else
  echo "create secret"
  PGPASSWORD=$(openssl rand -base64 32 | sed "s/[^[:alnum:]-]//g")
  if [[ $PGHOST == *"azure.com"* ]] && [ "$USE_AZURE_FLEX" == "false" ]; then
    PGUSER="${PGUSER}@${PGHOST}"
  fi
  PGSSLMODE="${PGSSLMODE:-require}"
  PGUSER_URLENCODED=$(printf %s "$PGUSER" |jq -sRr @uri)
  PGPASSWORD_URLENCODED=$(printf %s "$PGPASSWORD" |jq -sRr @uri)
  PGPORT="${PGPORT:-5432}"
  DATABASE_URL=postgresql://${PGUSER_URLENCODED}:${PGPASSWORD_URLENCODED}@${PGHOST}:${PGPORT}/${PGDATABASE}?sslmode=${PGSSLMODE}

  kubectl -n $NAMESPACE create secret generic $DB_SECRET_NAME \
    --from-literal="PGPASSWORD=$PGPASSWORD" \
    --from-literal="PGSSLMODE=$PGSSLMODE" \
    --from-literal="HASURA_GRAPHQL_DATABASE_URL=$DATABASE_URL" \
    --from-literal="DATABASE_URL=$DATABASE_URL" \
    --from-literal="PGDATABASE=$PGDATABASE" \
    --from-literal="PGHOST=$PGHOST" \
    --from-literal="PGPORT=$PGPORT" \
    --from-literal="PGUSER=$PGUSER"
fi

if [ "$NAMESPACE" != "$JOB_NAMESPACE" ]; then
  echo "copy secret '$DB_SECRET_NAME' from '$NAMESPACE' to '$JOB_NAMESPACE' "
  kubectl get secret "$DB_SECRET_NAME" --namespace="$NAMESPACE" -ojson \
    | jq 'del(.metadata.namespace,.metadata.resourceVersion,.metadata.uid) | .metadata.creationTimestamp=null' \
    | jq ".metadata.annotations[\"janitor/ttl\"] = \"$SECRET_TTL\"" \
    | kubectl -n "$JOB_NAMESPACE" apply -f -
fi