#!/usr/bin/env bash
set -euo pipefail

container=supabase_db_e-reader
database="e_reader_restore_${RANDOM}_$$"
book_hash="9469691b87b1dfb02a2b7240fe9ef0d1640ace0af514deaac72751cc28b270fb"
created=false

docker inspect "$container" >/dev/null
book_group=$(docker exec "$container" psql -X -At -U postgres -d postgres -c "select gen_random_uuid()")
snapshot=$(mktemp)

cleanup() {
  if [[ "$created" == true ]]; then
    docker exec "$container" dropdb -U postgres --if-exists "$database" >/dev/null
  fi
  docker exec "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres     -c "delete from public.groups where id = '$book_group'" >/dev/null
  rm -f "$snapshot"
}

trap cleanup EXIT

docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres <<SQL
insert into public.groups (id, name) values ('$book_group', 'Local restore fixture');
insert into public.books (group_id, id, title) values ('$book_group', '$book_hash', 'Restore test EPUB');
SQL

docker exec "$container" pg_dump -U postgres -d postgres --format=custom > "$snapshot"
docker exec "$container" createdb -U postgres --template=template0 "$database"
created=true
docker exec -i "$container" pg_restore -U postgres --exit-on-error --dbname="$database" < "$snapshot"

restored=$(docker exec "$container" psql -X -At -U postgres -d "$database"   -c "select title || '|' || file_hash from public.books where group_id = '$book_group' and id = '$book_hash'")
[[ "$restored" == "Restore test EPUB|$book_hash" ]]
printf 'Local backup restored into a new database with the expected book metadata.\n'
