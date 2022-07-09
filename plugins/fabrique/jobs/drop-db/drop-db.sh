#!/bin/bash
set -e

# check mandatory environment variables
MANDATORY_VARS="PGPASSWORD PGHOST PGUSER DATABASE"
for VAR in $MANDATORY_VARS; do
  if [[ -z "${!VAR}" ]]; then
    echo "${VAR} environment variable is empty"
    exit 1
  fi
done

PGPORT=${PGPORT:-5432}

# arobase replacement
PG_URL_ADMIN="postgresql://${PGUSER/@/%40}:${PGPASSWORD}@${PGHOST}:${PGPORT}/postgres"
DROP_USER_BASE=${PGUSER%%@*} || $PGUSER

echo
echo "disconnect activities on database ${DATABASE} on ${PGHOST}"
psql -abe "$PG_URL_ADMIN" -c "
  SET SESSION CHARACTERISTICS AS TRANSACTION READ WRITE;
  -- Disconnect users from database
  SELECT pg_terminate_backend (pg_stat_activity.pid)
  FROM pg_stat_activity
  WHERE pg_stat_activity.datname = '${DATABASE}';
"

echo
echo "deleting database ${DATABASE} on ${PGHOST}"
# dropdb "$DATABASE"
psql -abe "$PG_URL_ADMIN" <<EOF
  SET SESSION CHARACTERISTICS AS TRANSACTION READ WRITE;
  DROP DATABASE "$DATABASE";
EOF

echo
echo "deleting user ${DROP_USER_BASE} on ${PGHOST}"
psql -abe "$PG_URL_ADMIN" <<EOF
  SET SESSION CHARACTERISTICS AS TRANSACTION READ WRITE;
  REVOKE ALL PRIVILEGES ON SCHEMA public FROM "$DROP_USER_BASE";
  REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM "$DROP_USER_BASE";
  REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM "$DROP_USER_BASE";
  REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM "$DROP_USER_BASE";
  DROP OWNED BY "${DROP_USER_BASE}" CASCADE;
  DROP USER "${DROP_USER_BASE}";
EOF
