#!/usr/bin/env bash
# Guards OR-4048: Redpanda answers ListOffsets-by-timestamp by scanning the
# whole active segment. With the default segment.ms (2 weeks) low-traffic
# topics never roll, lookups exceed ender's 2s timeout and its offset commits
# stall. The kafka migration job must set segment.ms when configured, and
# leave topics untouched when it is not.
# Run: bash test_kafka_segment.sh   (needs helm and yq on PATH)
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="${HERE}/openreplay/files/kafka.sh"
CHART="${HERE}/openreplay"

fails=0
pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; fails=$((fails + 1)); }

# Run kafka.sh against stub kafka CLIs that record their arguments.
run_script() { # extra env assignments...
  local bin; bin="$(mktemp -d)"
  printf '#!/bin/sh\necho "$*" >>"%s/calls"\n' "$bin" >"$bin/kafka-configs.sh"
  printf '#!/bin/sh\nexit 0\n' >"$bin/kafka-topics.sh"
  chmod +x "$bin"/*.sh
  env PATH="$bin:$PATH" KAFKA_HOST=k KAFKA_PORT=9092 RETENTION_TIME=14400000 "$@" \
    bash "$SCRIPT" init >/dev/null 2>&1
  cat "$bin/calls" 2>/dev/null
  rm -rf "$bin"
}

topics=$(awk '/^topics=\(/,/^\)/' "$SCRIPT" | grep -c '"')

# B1: SEGMENT_TIME set -> every topic gets segment.ms alongside retention.ms.
calls="$(run_script SEGMENT_TIME=1800000)"
n=$(grep -c 'retention.ms=14400000,segment.ms=1800000 ' <<<"$calls")
if [ "$n" -eq "$topics" ]; then pass "segment.ms set on all $topics topics"; else
  fail "segment.ms set on $n of $topics topics"; echo "$calls"; fi

# B2: SEGMENT_TIME unset or empty -> segment.ms never sent, retention unchanged.
for case in "unset" "empty"; do
  if [ "$case" = unset ]; then calls="$(run_script)"; else calls="$(run_script SEGMENT_TIME=)"; fi
  if grep -q 'segment.ms' <<<"$calls"; then fail "segment.ms sent when SEGMENT_TIME $case"; else
    pass "no segment.ms when SEGMENT_TIME $case"; fi
  n=$(grep -c 'retention.ms=14400000 ' <<<"$calls")
  if [ "$n" -eq "$topics" ]; then pass "retention.ms still set on all topics ($case)"; else
    fail "retention.ms set on $n of $topics topics ($case)"; fi
done

# B3: chart wires global.kafka.segmentTime into the kafka migration container.
# Prints the kafka container's SEGMENT_TIME (empty if absent). Fails the run
# if the container itself is missing, so a broken render can't pass as "unset".
render_env() { # extra helm args...
  local env
  env="$(helm template t "$CHART" -f "${HERE}/vars.yaml" --set forceKafkaMigration=true "$@" 2>/dev/null |
    yq 'select(.kind == "Job") | .spec.template.spec.containers[] | select(.name == "kafka") | .env[] | .name + "=" + .value')"
  grep -q '^RETENTION_TIME=' <<<"$env" || { echo "NO_KAFKA_CONTAINER"; return; }
  sed -n 's/^SEGMENT_TIME=//p' <<<"$env"
}
got="$(render_env --set-string global.kafka.segmentTime=1800000)"
if [ "$got" = "1800000" ]; then pass "chart renders SEGMENT_TIME from global.kafka.segmentTime"; else
  fail "chart SEGMENT_TIME want '1800000' got '$got'"; fi
got="$(render_env)"
if [ -z "$got" ]; then pass "chart omits SEGMENT_TIME when segmentTime unset"; else
  fail "chart SEGMENT_TIME rendered as '$got' when unset"; fi

[ "$fails" -eq 0 ] || { echo "$fails failure(s)"; exit 1; }
echo "all passed"
