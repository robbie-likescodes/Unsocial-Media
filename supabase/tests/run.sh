#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
postgres_image="${RABBIT_HOLE_POSTGRES_IMAGE:-postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24}"
test_container=""

cleanup() {
  if [[ -n "$test_container" ]]; then
    docker rm --force "$test_container" >/dev/null
  fi
}
trap cleanup EXIT

# No host ports and no container networking. Trust authentication is confined to
# this disposable test container, accessed only through Docker's exec interface.
test_container="$(docker run --detach --network none \
  --env POSTGRES_HOST_AUTH_METHOD=trust \
  --env POSTGRES_DB=rabbit_hole_tests \
  --label org.rabbit-hole.test=database-permissions \
  "$postgres_image")"

ready=false
for ((attempt = 0; attempt < 30; attempt++)); do
  if docker exec "$test_container" pg_isready -U postgres -d rabbit_hole_tests >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  docker logs "$test_container" >&2
  exit 1
fi

# These are only the Supabase-specific auth primitives needed by the migration.
# The permissions themselves are exercised by PostgreSQL's real RLS engine.
docker exec --interactive "$test_container" \
  psql -q -U postgres -d rabbit_hole_tests -v ON_ERROR_STOP=1 <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
SQL

for migration in "$repo_root"/supabase/migrations/*.sql; do
  docker exec --interactive "$test_container" \
    psql -q -U postgres -d rabbit_hole_tests -v ON_ERROR_STOP=1 < "$migration"
done
docker exec --interactive "$test_container" \
  psql -q -U postgres -d rabbit_hole_tests -v ON_ERROR_STOP=1 \
  < "$repo_root/supabase/tests/permissions.sql" >/dev/null

printf '%s\n' 'Database migration and permission checks passed.'
