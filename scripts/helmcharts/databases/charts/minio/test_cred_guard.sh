#!/usr/bin/env bash
# Guards against issue #4993: single-sided global.s3.* override diverging from
# the in-cluster minio server creds, which fails databases-migrate with
# "The Access Key Id you provided does not exist".
# Run: bash test_cred_guard.sh   (needs helm on PATH)
set -u
CHART="$(cd "$(dirname "$0")" && pwd)"
fails=0
check() { # name expect(pass|fail) args...
  local name=$1 expect=$2; shift 2
  if helm template "$CHART" "$@" >/dev/null 2>/tmp/_mg_err; then got=pass; else got=fail; fi
  if [ "$got" = "$expect" ]; then echo "PASS: $name"; else
    echo "FAIL: $name (expected $expect got $got)"; cat /tmp/_mg_err; fails=$((fails+1)); fi
}
MINIO_EP=http://minio.db.svc.cluster.local:9000

check "accessKey-only mismatch -> fail" fail \
  --set global.minio.accessKey=S_KEY --set global.minio.secretKey=SAME_SEC \
  --set global.s3.endpoint=$MINIO_EP --set global.s3.accessKey=C_KEY --set global.s3.secretKey=SAME_SEC
check "secretKey mismatch -> fail" fail \
  --set global.minio.accessKey=AAA --set global.minio.secretKey=S_SEC \
  --set global.s3.endpoint=$MINIO_EP --set global.s3.accessKey=AAA --set global.s3.secretKey=C_SEC
check "secretKey-only mismatch (accessKey unset) -> fail" fail \
  --set global.minio.accessKey=AAA --set global.minio.secretKey=S_SEC \
  --set global.s3.endpoint=$MINIO_EP --set global.s3.secretKey=C_SEC
check "matching creds -> render" pass \
  --set global.minio.accessKey=AAA --set global.minio.secretKey=BBB \
  --set global.s3.endpoint=$MINIO_EP --set global.s3.accessKey=AAA --set global.s3.secretKey=BBB
check "external s3 endpoint -> render" pass \
  --set global.minio.accessKey=AAA --set global.minio.secretKey=BBB \
  --set global.s3.endpoint=https://s3.amazonaws.com --set global.s3.accessKey=C_KEY --set global.s3.secretKey=C_SEC
check "no s3 override -> render" pass \
  --set global.minio.accessKey=AAA --set global.minio.secretKey=BBB

[ "$fails" -eq 0 ] && { echo "ALL PASS"; exit 0; } || { echo "$fails FAILED"; exit 1; }
