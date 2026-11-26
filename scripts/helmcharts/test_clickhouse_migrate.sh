#!/usr/bin/env bash
# Guards OR-4040: after a failed ClickHouse migration, a rerun must resume
# from ClickHouse's own markers (openreplay_version / openreplay_migration_state),
# not from the openreplay-version ConfigMap, which only moves after a fully
# successful upgrade. Resuming from the ConfigMap ran steps of the wrong
# version, skipped the interrupted one, and still reported success.
#
# A stub clickhouse-client keeps the two markers in files, records which SQL
# files run, and enforces the throwIf guards the real step files carry. It
# runs against the real migration tree in scripts/schema.
# Run: bash test_clickhouse_migrate.sh   (Linux, bash)
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="${HERE}/openreplay/files/clickhouse.sh"
CHDIR="$(cd "${HERE}/../schema/db/init_dbs/clickhouse" && pwd)"

fails=0
pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; fails=$((fails + 1)); }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/bin"

# Script under test, pointed at the real migration tree.
sed "s#^clickhousedir=.*#clickhousedir=${CHDIR}#" "$SCRIPT" >"$WORK/clickhouse.sh"

cat >"$WORK/bin/clickhouse-client" <<'STUB'
#!/usr/bin/env bash
# Markers live in $CH_STUB/v and $CH_STUB/s. Executed files go to $CH_STUB/ran.
q=""
while [ $# -gt 0 ]; do
  case "$1" in -q) q="$2"; shift ;; esac
  shift
done
if [ -n "$q" ]; then
  case "$q" in
    *"SELECT openreplay_migration_state()"*) cat "$CH_STUB/s" ;;
    *"SELECT openreplay_version()"*) cat "$CH_STUB/v" ;;
  esac
  exit 0
fi
file="$(readlink /proc/$$/fd/0)"
echo "${file#"$CH_ROOT"/}" >>"$CH_STUB/ran"
if [ -n "${CH_STUB_FAIL:-}" ] && [ "${file#"$CH_ROOT"/}" = "$CH_STUB_FAIL" ]; then
  echo "stub: injected failure at $CH_STUB_FAIL" >&2; exit 1
fi
sql="$(tr '\n' ' ' | tr -s ' ')"
re_need_v="throwIf\(\(SELECT openreplay_version\(\)\) != '([^']+)'"
re_need_done="throwIf\(\(SELECT openreplay_migration_state\(\)\) > -1"
re_need_s="throwIf\(\(SELECT openreplay_migration_state\(\)\) != (-?[0-9]+)"
re_set_v="CREATE OR REPLACE FUNCTION openreplay_version AS\(\) ?-> ?'([^']+)'"
re_set_s="CREATE OR REPLACE FUNCTION openreplay_migration_state AS\(\) ?-> ?\(?(-?[0-9]+)"
IFS=';' read -r -d '' -a stmts <<<"$sql"
for st in "${stmts[@]}"; do
  v="$(cat "$CH_STUB/v")"; s="$(cat "$CH_STUB/s")"
  if [[ $st =~ $re_need_v ]] && [ "$v" != "${BASH_REMATCH[1]}" ]; then
    echo "stub: version $v != ${BASH_REMATCH[1]}" >&2; exit 1; fi
  if [[ $st =~ $re_need_done ]] && [ "$s" -gt -1 ]; then
    echo "stub: previous migration not finished ($v/$s)" >&2; exit 1; fi
  if [[ $st =~ $re_need_s ]] && [ "$s" != "${BASH_REMATCH[1]}" ]; then
    echo "stub: state $s != ${BASH_REMATCH[1]}" >&2; exit 1; fi
  if [[ $st =~ $re_set_v ]]; then echo "${BASH_REMATCH[1]}" >"$CH_STUB/v"; fi
  if [[ $st =~ $re_set_s ]]; then echo "${BASH_REMATCH[1]}" >"$CH_STUB/s"; fi
done
exit 0
STUB
chmod +x "$WORK/bin/clickhouse-client"

versions="$(ls "$CHDIR" | grep -v '^create$' | sort -V)"
top="v$(tail -n1 <<<"$versions")"

# Versions dbops.sh passes when the ConfigMap says $1 (every folder above it).
requested() {
  local from="${1#v}" v out=()
  for v in $versions; do
    [ "$v" != "$from" ] && [ "$(printf '%s\n%s\n' "$v" "$from" | sort -V | tail -n1)" = "$v" ] && out+=("$v")
  done
  (IFS=,; echo "${out[*]}")
}

# Fresh stub with markers $1/$2. Sets $STUB.
new_stub() {
  STUB="$(mktemp -d -p "$WORK")"
  echo "$1" >"$STUB/v"; echo "$2" >"$STUB/s"; : >"$STUB/ran"
}

# Run migrate with the version list $1 against $STUB. Sets $RC and $OUT.
run_migrate() {
  OUT="$(env PATH="$WORK/bin:$PATH" CH_STUB="$STUB" CH_ROOT="$CHDIR" \
    CH_HOST=h CH_PORT=9000 CH_USERNAME=u CH_PASSWORD= "${@:2}" \
    bash "$WORK/clickhouse.sh" migrate "$1" 2>&1)"
  RC=$?
}

markers() { echo "$(cat "$STUB/v")/$(cat "$STUB/s")"; }
ran_any() { grep -q "^$1/" "$STUB/ran"; }
first_ran() { head -n1 "$STUB/ran"; }

# C1: failure mid-version, rerun with the unchanged ConfigMap list.
# Every step of every version runs exactly once across both runs.
new_stub v1.22.0 -1
list="$(requested v1.22.0)"
run_migrate "$list" CH_STUB_FAIL=1.24.0/4.sql
if [ "$RC" -ne 0 ] && [ "$(markers)" = "v1.24.0/3" ]; then pass "C1 run 1 stops at 1.24.0/4 with markers v1.24.0/3"; else
  fail "C1 run 1 want rc!=0 and v1.24.0/3, got rc=$RC markers=$(markers)"; fi
cp "$STUB/ran" "$STUB/ran1"; : >"$STUB/ran"
run_migrate "$list"
dups="$(grep -v '^1.24.0/4.sql$' "$STUB/ran1" | cat - "$STUB/ran" | sort | uniq -d)"
want="$(cd "$CHDIR" && for v in $(tr , ' ' <<<"$list"); do
  if [ -f "$v/$v.sql" ]; then echo "$v/$v.sql"; else ls "$v" | sort -V | sed "s#^#$v/#"; fi; done | sort)"
got="$(grep -v '^1.24.0/4.sql$' "$STUB/ran1" | cat - "$STUB/ran" | sort -u)"
if [ "$RC" -eq 0 ] && [ "$(markers)" = "$top/-1" ] && [ -z "$dups" ] && [ "$want" = "$got" ]; then
  pass "C1 rerun resumes at 1.24.0/4 and finishes at $top, each step once"; else
  fail "C1 rerun rc=$RC markers=$(markers) first=$(first_ran)"
  [ -n "$dups" ] && echo "  ran twice: $(tr '\n' ' ' <<<"$dups")"
  diff <(echo "$want") <(echo "$got") | sed 's/^/  /' | head -10; fi
if [ "$(first_ran)" = "1.24.0/4.sql" ]; then pass "C1 rerun starts at 1.24.0/4.sql"; else
  fail "C1 rerun starts at '$(first_ran)', want 1.24.0/4.sql"; fi

# C2: shiphawk markers v1.24.0/4, ConfigMap still v1.22.0.
new_stub v1.24.0 4
run_migrate "$(requested v1.22.0)"
if [ "$RC" -eq 0 ] && [ "$(first_ran)" = "1.24.0/5.sql" ] && ! ran_any 1.23.0 && [ "$(markers)" = "$top/-1" ]; then
  pass "C2 resumes 1.24.0 at step 5, never touches 1.23.0"; else
  fail "C2 rc=$RC first=$(first_ran) ran_1.23.0=$(ran_any 1.23.0 && echo yes || echo no) markers=$(markers)"; fi
if grep -q "v1.24.0/4" <<<"$OUT" && grep -q "requested" <<<"$OUT"; then pass "C2 logs ClickHouse markers next to the requested versions"; else
  fail "C2 log does not show markers v1.24.0/4 and the requested versions"; fi

# C3: DB ahead of the ConfigMap (v1.25.0/3, ConfigMap v1.23.0).
new_stub v1.25.0 3
run_migrate "$(requested v1.23.0)"
if [ "$RC" -eq 0 ] && [ "$(first_ran)" = "1.25.0/4.sql" ] && ! ran_any 1.24.0 && [ "$(markers)" = "$top/-1" ]; then
  pass "C3 DB ahead: resumes 1.25.0 at step 4"; else
  fail "C3 rc=$RC first=$(first_ran) markers=$(markers)"; fi

# C4: DB behind the ConfigMap (v1.23.0 done, ConfigMap v1.25.0).
new_stub v1.23.0 -1
run_migrate "$(requested v1.25.0)"
if [ "$RC" -eq 0 ] && [ "$(first_ran)" = "1.24.0/0.sql" ] && [ "$(markers)" = "$top/-1" ]; then
  pass "C4 DB behind: runs 1.24.0 from step 0"; else
  fail "C4 rc=$RC first=$(first_ran) markers=$(markers)"; fi

# C5: DB already at the newest version.
new_stub "$top" -1
run_migrate "$(requested v1.22.0)"
if [ "$RC" -eq 0 ] && [ ! -s "$STUB/ran" ]; then pass "C5 DB at $top: runs nothing"; else
  fail "C5 rc=$RC ran=$(tr '\n' ' ' <"$STUB/ran")"; fi

# C6: no markers yet (before 1.22): the requested list is used as before.
new_stub v0.0.0 -1
run_migrate "$(requested v1.21.0)"
if [ "$RC" -eq 0 ] && [ "$(first_ran)" = "1.22.0/1.22.0.sql" ] && [ "$(markers)" = "$top/-1" ]; then
  pass "C6 no markers: uses requested list from 1.22.0"; else
  fail "C6 rc=$RC first=$(first_ran) markers=$(markers)"; fi

# C7: in-progress version whose folder is not in this release: fail, run nothing.
new_stub v9.0.0 2
run_migrate "$(requested v1.22.0)"
if [ "$RC" -ne 0 ] && [ ! -s "$STUB/ran" ]; then pass "C7 unknown in-progress version fails without running steps"; else
  fail "C7 rc=$RC ran=$(head -3 "$STUB/ran" | tr '\n' ' ')"; fi

echo
[ "$fails" -eq 0 ] && echo "ALL PASS" || { echo "$fails FAILED"; exit 1; }
