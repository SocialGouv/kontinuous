#!/bin/bash
set -e

# check mandatory environment variables
MANDATORY_VARS="PGPASSWORD PGHOST PGUSER PGDATABASE RESTORE_PATH OWNER"
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
  if [[ ${MOUNT_PATH:length-1:1} != "/" ]]; then
    export MOUNT_PATH="$MOUNT_PATH/"
  fi
fi
DUMP=$(eval echo "${MOUNT_PATH}${RESTORE_PATH}")

echo "Restore ${DUMP} into ${PGDATABASE}"

pg_isready

set +e

pg_restore \
  --dbname "$PGDATABASE" \
  --clean --if-exists \
  --exclude-schema=audit \
  --no-owner \
  --role "$PGUSER" \
  --no-acl \
  --verbose \
  "${DUMP}"

set -e

OWNER=${OWNER%%@*}

psql -v ON_ERROR_STOP=1 "$PGDATABASE" -c "ALTER SCHEMA public OWNER TO \"${OWNER}\";"