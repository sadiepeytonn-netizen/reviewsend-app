#!/usr/bin/env bash
# TEST ONLY: runs the migrations against a throwaway local Postgres.
# Usage: PGHOST=... PGPORT=... ./run.sh
set -u
cd "$(dirname "$0")"
M=../migrations
DB=rs_migration_test
psql -q -U postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
run() { psql -q -U postgres -d $DB -v ON_ERROR_STOP=1 -At -f "$1" 2>&1; }
run 00_fake_supabase_and_current_schema.sql | grep -v '^$' || true
run 10_seed_and_helpers.sql | grep -v '^$' || true
echo "== applying step 1"; run $M/20261027_01_security_foundation.sql | grep -vE '^$|^(BEGIN|COMMIT)$' || true
run 20_after_step1.sql | grep -E 'PASS|FAIL|ERROR'
echo "== applying step 2"; run $M/20261027_02_lock_down_rules.sql | grep -vE '^$|^(BEGIN|COMMIT)$' || true
run 30_after_step2.sql | grep -E 'PASS|FAIL|ERROR'
echo "== step 3 must refuse while an employee has no login"
run $M/20261027_03_cleanup.sql | grep -E 'ERROR' | head -2
psql -q -U postgres -d $DB -c "update public.employees set auth_user_id = gen_random_uuid()" >/dev/null
echo "== applying step 3"; run $M/20261027_03_cleanup.sql | grep -vE '^$|^(BEGIN|COMMIT)$' || true
run 40_after_step3.sql | grep -E 'PASS|FAIL|ERROR'
echo "== applying step 4"; run $M/20261028_04_crm_foundation.sql | grep -vE '^$|^(BEGIN|COMMIT)$' || true
run 50_after_step4.sql | grep -E 'PASS|FAIL|ERROR'
echo "== applying step 5"; run $M/20261028_05_packages_and_handoff.sql | grep -vE '^$|^(BEGIN|COMMIT)$' || true
run 60_after_step5.sql | grep -E 'PASS|FAIL|ERROR'
echo "== applying step 6"; run $M/20261028_06_company_login_packages.sql | grep -vE '^$|^(BEGIN|COMMIT)$' || true
run 70_after_step6.sql | grep -E 'PASS|FAIL|ERROR'
echo "== applying step 7"; run $M/20261028_07_team_active.sql | grep -vE '^$|^(BEGIN|COMMIT)$' || true
run 80_after_step7.sql | grep -E 'PASS|FAIL|ERROR'
echo "== applying step 8"; run $M/20261029_08_tasks_and_work_sessions.sql | grep -vE '^$|^(BEGIN|COMMIT)$' || true
run 90_after_step8.sql | grep -E 'PASS|FAIL|ERROR'
