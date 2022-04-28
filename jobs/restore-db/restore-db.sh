#!/bin/bash
set -e

# check mandatory environment variables
MANDATORY_VARS="PGPASSWORD PGHOST PGUSER PGDATABASE"
for VAR in $MANDATORY_VARS; do
  if [[ -z "${!VAR}" ]]; then
    echo "${VAR} environment variable is empty"
    exit 1
  fi
done

PGPORT=${PGPORT:-5432}

if [ -n "$RESTORE_PATH" ]; then
  DUMP="$RESTORE_PATH"
else
  LATEST=$(ls -1Fr /mnt/data | head -n 1);
  DUMP="/mnt/data/\${LATEST}\${FILE}"
fi

echo "Restore \${DUMP} into \${PGDATABASE}";

pg_isready;

pg_restore \
  --dbname \${PGDATABASE} \
  --clean --if-exists \
  --exclude-schema=audit \
  --no-owner \
  --no-acl \
  --verbose \
  \${DUMP};


