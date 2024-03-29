#!/bin/bash
set -e

# check mandatory environment variables
MANDATORY_VARS="PGPASSWORD NEW_DB_NAME NEW_USER NEW_PASSWORD"
for VAR in $MANDATORY_VARS; do
  if [[ -z "${!VAR}" ]]; then
    echo "${VAR} environment variable is empty"
    exit 1
  fi
done

# set defaults
PGUSER=${PGUSER:-postgres}
PGPORT=${PGPORT:-5432}
PGHOST=${PGHOST:-127.0.0.1}

# urlencode the original pg user
# ORIGINAL_PGUSER_URLENCODED=${PGUSER/@/%40}
ORIGINAL_PGUSER_URLENCODED=$(printf %s "$PGUSER" |jq -sRr @uri)
PGPASSWORD_URLENCODED=$(printf %s "$PGPASSWORD" |jq -sRr @uri)

PG_URL_ADMIN="postgresql://${ORIGINAL_PGUSER_URLENCODED}:${PGPASSWORD_URLENCODED}@${PGHOST}:${PGPORT}/postgres"
PG_URL_NEWDB="postgresql://${ORIGINAL_PGUSER_URLENCODED}:${PGPASSWORD_URLENCODED}@${PGHOST}:${PGPORT}/${NEW_DB_NAME}"

# strip after @ part to handle azure pg users
PGUSER=${PGUSER%%@*}

PGSSLMODE="${PGSSLMODE:-require}"

# /o\ get base user name (without server) for SQL commands
# strip after @ part to handle azure pg users
NEW_USER_BASE=${NEW_USER%%@*}


if psql -abe "$PG_URL_ADMIN" -c "\c ${NEW_DB_NAME}"; then
  echo "Database already exist, skip creation"
  echo "false" >$KONTINUOUS_OUTPUT/CREATED
else
  echo "Creating database ${NEW_DB_NAME} on ${PGHOST}"
  psql -abe "$PG_URL_ADMIN" -c "CREATE DATABASE \"$NEW_DB_NAME\";"
  echo "true" >$KONTINUOUS_OUTPUT/CREATED
fi

echo "Creating database extensions ${NEW_DB_NAME}"
if [[ -n "${NEW_DB_EXTENSIONS}" ]]; then
  CREATE_CMD=""
  for EXTENSION in ${NEW_DB_EXTENSIONS[@]}; do
    CREATE_CMD="$CREATE_CMD CREATE EXTENSION IF NOT EXISTS \"${EXTENSION}\";"
  done
  psql -abe "$PG_URL_NEWDB" -c "${CREATE_CMD}";
fi

if [[ -n $(psql -qtA "$PG_URL_ADMIN" -c "\du ${NEW_USER_BASE}" | cut -d "|" -f 1) ]]; then
  echo "User already exist, skip creation"
else
  echo "Creating user ${NEW_USER_BASE} on ${PGHOST}"
  psql -abe "$PG_URL_ADMIN" -c "CREATE USER \"$NEW_USER_BASE\""
fi

echo "Set password for user ${NEW_USER_BASE}"
psql -ab "$PG_URL_ADMIN" -c "ALTER USER \"$NEW_USER_BASE\" WITH PASSWORD '$NEW_PASSWORD';"

echo "Grant user \"${NEW_USER_BASE}\" to \"${PGUSER}\""
psql -abe "$PG_URL_ADMIN" -c "
  GRANT \"$NEW_USER_BASE\" to \"${PGUSER}\";
  GRANT ALL PRIVILEGES ON DATABASE \"$NEW_DB_NAME\" TO \"$NEW_USER_BASE\";

  GRANT USAGE ON SCHEMA public TO \"$NEW_USER_BASE\";
  GRANT ALL ON ALL TABLES IN SCHEMA public TO \"$NEW_USER_BASE\";
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO \"$NEW_USER_BASE\";
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO \"$NEW_USER_BASE\";
  ALTER DATABASE \"$NEW_DB_NAME\" OWNER TO \"$NEW_USER_BASE\";
"
