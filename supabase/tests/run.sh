#!/bin/bash
# Tests supabase/schema.sql + its security rules on a LOCAL PostgreSQL (15+).
# Never point this at your real Supabase project: it creates and drops a
# database called ktech_rls_test. Connection comes from the usual PG* env vars
# (PGHOST, PGUSER, ...). Example: PGUSER=postgres ./run.sh
set -e
cd "$(dirname "$0")"
DB=ktech_rls_test
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -q -d $DB -v ON_ERROR_STOP=1 -f 00_supabase_stubs.sql 2>/dev/null
for i in 1 2; do  # twice, to prove the script can be re-run
  psql -q -d $DB -v ON_ERROR_STOP=1 -f ../schema.sql 2>&1 | grep -E "ERROR" && exit 1 || true
done
echo "schema.sql applied twice without errors"
psql -q -d $DB -v ON_ERROR_STOP=1 -o /dev/null -f 10_rls_tests.sql
psql -d $DB -A -F ' | ' -t \
  -c "select case when ok then 'PASS' else 'FAIL' end, label, coalesce(detail, '') from test.results order by n" \
  -c "select 'passed=' || count(*) filter (where ok) || '  failed=' || count(*) filter (where not ok) from test.results"
psql -q -d postgres -c "drop database $DB"
