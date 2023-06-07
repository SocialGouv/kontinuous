#!/bin/bash

set -e

# create default CNPG database password
# https://www.postgresql.org/docs/15/libpq-pgpass.html
# hostname:port:database:username:password
if [ -n "$(kubectl -n $NAMESPACE get secret $CNPG_DB_SECRET_NAME 2>/dev/null)" ]; then
  echo "cnpg db secret secret named '$CNPG_DB_SECRET_NAME' already exists in namespace '$NAMESPACE'"
else
  echo "create cnpg db secret"
  PGPASSWORD=$(openssl rand -base64 32 | sed "s/[^[:alnum:]-]//g")
  kubectl -n $NAMESPACE create secret generic $CNPG_DB_SECRET_NAME \
    --from-literal="username=$PGUSER" \
    --from-literal="password=$PGPASSWORD" \
    --from-literal="pgpass=$HBA_HOST:*:$HBA_DATABASE:$HBA_USER:*"
fi

# create standard secret for the application
if [ -n "$(kubectl -n $NAMESPACE get secret $APP_DB_SECRET_NAME 2>/dev/null)" ]; then
  echo "app db secret named '$APP_DB_SECRET_NAME' already exists in namespace '$NAMESPACE'"
else
  echo "create db secret for app"
  PGUSER="$(kubectl -n $NAMESPACE get secrets $CNPG_DB_SECRET_NAME -o jsonpath={.data.username} | base64 -d)"
  PGPASSWORD="$(kubectl -n $NAMESPACE get secrets $CNPG_DB_SECRET_NAME -o jsonpath={.data.password} | base64 -d)"
  PGSSLMODE="${PGSSLMODE:-require}"
  PGUSER_URLENCODED=$(printf %s "$PGUSER" |jq -sRr @uri)
  PGPASSWORD_URLENCODED=$(printf %s "$PGPASSWORD" |jq -sRr @uri)
  PGPORT="${PGPORT:-5432}"
  DATABASE_URL="postgresql://${PGUSER_URLENCODED}:${PGPASSWORD_URLENCODED}@${PGHOST}:${PGPORT}/${PGDATABASE}?sslmode=${PGSSLMODE}"

  kubectl -n $NAMESPACE create secret generic $APP_DB_SECRET_NAME \
    --from-literal="PGPASSWORD=$PGPASSWORD" \
    --from-literal="PGSSLMODE=$PGSSLMODE" \
    --from-literal="HASURA_GRAPHQL_DATABASE_URL=$DATABASE_URL" \
    --from-literal="DATABASE_URL=$DATABASE_URL" \
    --from-literal="PGDATABASE=$PGDATABASE" \
    --from-literal="PGHOST=$PGHOST" \
    --from-literal="PGPORT=$PGPORT" \
    --from-literal="PGUSER=$PGUSER"
fi
