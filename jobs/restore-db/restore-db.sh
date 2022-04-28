#!/bin/bash
set -e

# check mandatory environment variables
MANDATORY_VARS="PGPASSWORD PGHOST PGUSER PGDATABASE RESTORE_PATH"
for VAR in $MANDATORY_VARS; do
  if [[ -z "${!VAR}" ]]; then
    echo "${VAR} environment variable is empty"
    exit 1
  fi
done

PGPORT=${PGPORT:-5432}

MOUNT_PATH=${MOUNT_PATH:-""}
if [ -n "$MOUNT_PATH" ]; then
  export LATEST=$(ls -1Fr $MOUNT_PATH | head -n 1);
fi
DUMP=$(eval "${MOUNT_PATH}${RESTORE_PATH}")

echo "Restore ${DUMP} into ${PGDATABASE}"

pg_isready

pg_restore \
  --dbname "${PGDATABASE}" \
  --clean --if-exists \
  --exclude-schema=audit \
  --no-owner \
  --no-acl \
  --verbose \
  "${DUMP}"