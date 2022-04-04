#!/bin/bash
set -e

# check mandatory environment variables
MANDATORY_VARS="PGPASSWORD PGHOST PGUSER PGDATABASE SEED_PATH"
for VAR in $MANDATORY_VARS; do
  if [[ -z "${!VAR}" ]]; then
    echo "${VAR} environment variable is empty"
    exit 1
  fi
done

PGPORT=${PGPORT:-5432}

psql -b < "/workspace/${SEED_PATH}"
