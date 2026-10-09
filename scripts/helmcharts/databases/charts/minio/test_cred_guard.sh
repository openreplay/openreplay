#!/usr/bin/env bash
# Guards against issue #4993: single-sided global.s3.* override diverging from
# the in-cluster minio server creds, which fails databases-migrate with
# "The Access Key Id you provided does not exist".
# Run: bash test_cred_guard.sh   (needs helm on PATH)
set -u
CHART="$(cd "$(dirname "$0")" && pwd)"
ERR="$(mktemp)"
trap 'rm -f "$ERR"' EXIT
fails=0
check() { # name expect(pass|fail) [expect_msg] --set ...
  local name=$1 expect=$2; shift 2
  local want=""; case "${1:-}" in --*) ;; *) want=$1; shift;; esac
  if helm template "$CHART" "$@" >/dev/null 2>"$ERR"; then got=pass; else got=fail; fi
  local ok=1 why=""
  [ "$got" = "$expect" ] || { ok=0; why="expected $expect got $got"; }
  if [ "$ok" = 1 ] && [ -n "$want" ] && ! grep -qF "$want" "$ERR"; then
    ok=0; why="missing guard message: $want"; fi
  if [ "$ok" = 1 ]; then echo "PASS: $name"; else
    echo "FAIL: $name ($why)"; cat "$ERR"; fails=$((fails+1)); fi
}
ACCESS_MSG="does not match the minio accessKey"
SECRET_MSG="does not match the minio secretKey"
MINIO_EP=http://minio.db.svc.cluster.local:9000

check "accessKey-only mismatch -> fail w/ accessKey diag" fail "$ACCESS_MSG" \
  --set global.minio.accessKey=S_KEY --set global.minio.secretKey=SAME_SEC \
  --set global.s3.endpoint=$MINIO_EP --set global.s3.accessKey=C_KEY --set global.s3.secretKey=SAME_SEC
check "secretKey-only mismatch -> fail w/ secretKey diag" fail "$SECRET_MSG" \
  --set global.minio.accessKey=AAA --set global.minio.secretKey=S_SEC \
  --set global.s3.endpoint=$MINIO_EP --set global.s3.accessKey=AAA --set global.s3.secretKey=C_SEC
# 'or $s3.secretKey' gate: setting only secretKey (accessKey unset) must still
# enter validation. Unset accessKey ("") mismatches minio's, so it trips the
# accessKey diag -- this verifies the gate, not the secretKey comparison.
check "secretKey-only override triggers gate -> fail" fail "$ACCESS_MSG" \
  --set global.minio.accessKey=AAA --set global.minio.secretKey=S_SEC \
  --set global.s3.endpoint=$MINIO_EP --set global.s3.secretKey=C_SEC
check "matching creds -> render" pass \
  --set global.minio.accessKey=AAA --set global.minio.secretKey=BBB \
  --set global.s3.endpoint=$MINIO_EP --set global.s3.accessKey=AAA --set global.s3.secretKey=BBB
check "external s3 endpoint -> render" pass \
  --set global.minio.accessKey=AAA --set global.minio.secretKey=BBB \
  --set global.s3.endpoint=https://s3.amazonaws.com --set global.s3.accessKey=C_KEY --set global.s3.secretKey=C_SEC
check "external host containing 'minio' but no .svc -> render" pass \
  --set global.minio.accessKey=AAA --set global.minio.secretKey=BBB \
  --set global.s3.endpoint=https://minio.example.com --set global.s3.accessKey=C_KEY --set global.s3.secretKey=C_SEC
check "no s3 override -> render" pass \
  --set global.minio.accessKey=AAA --set global.minio.secretKey=BBB

[ "$fails" -eq 0 ] && { echo "ALL PASS"; exit 0; } || { echo "$fails FAILED"; exit 1; }
