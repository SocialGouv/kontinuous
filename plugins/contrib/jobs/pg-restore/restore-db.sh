#!/bin/bash
set -e

if [ -n "$INPUT_PGDATABASE" ]; then
  PGDATABASE="$INPUT_PGDATABASE"
fi

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
  FILTER_PATH=${FILTER_PATH:-".*"}
  export LATEST=$(ls -1FR "$MOUNT_PATH" | grep -E "[0-9]{4}_[0-9]{2}_[0-9]{2}_${FILTER_PATH}" | sort -r | head -n 1);
  if [[ ${MOUNT_PATH:length-1:1} != "/" ]]; then
    export MOUNT_PATH="$MOUNT_PATH/"
  fi
fi

DUMP=$(eval echo "${MOUNT_PATH}${RESTORE_PATH}")

OWNER=${OWNER%%@*}

echo "Restore ${DUMP} into ${PGDATABASE}"

pg_isready

set +e

pg_restore \
  --dbname "$PGDATABASE" \
  --clean --if-exists \
  --no-owner \
  --role "$OWNER" \
  --no-acl \
  --verbose \
  "${DUMP}"

set -e


psql -v ON_ERROR_STOP=1 "$PGDATABASE" -c "ALTER SCHEMA public OWNER TO \"${OWNER}\";"