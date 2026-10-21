#!/bin/bash
# Verifies minio.sh grants anonymous read-only object access on
# sessions-assets, without bucket listing (GHSA-j6c9-g48h-wh4c).
#
# Usage: test_anon_policy.sh [path/to/minio.sh] [rustfs_tag]
# Needs docker. Runs throwaway rustfs + migration image, probes with curl.
set -u
DIR=$(cd "$(dirname "$0")" && pwd)
SCRIPT=$(realpath "${1:-$DIR/../../helmcharts/openreplay/files/minio.sh}")
TAG=${2:-1.0.0}
NET=or-anon-test-net
SRV=or-anon-test-rustfs
AK=testaccess
SK=testsecret123

cleanup() {
    docker rm -f $SRV >/dev/null 2>&1
    docker network rm $NET >/dev/null 2>&1
}
trap cleanup EXIT
cleanup

docker network create $NET >/dev/null
docker run -d --name $SRV --network $NET \
    -e RUSTFS_ACCESS_KEY=$AK -e RUSTFS_SECRET_KEY=$SK \
    -e RUSTFS_ADDRESS=0.0.0.0:9000 -e RUSTFS_VOLUMES=/data \
    docker.io/rustfs/rustfs:$TAG >/dev/null

curl_code() {
    docker run --rm --network $NET curlimages/curl -s -o /dev/null -w '%{http_code}' "$1"
}
for _ in $(seq 30); do
    [ "$(curl_code http://$SRV:9000/)" != 000 ] && break
    sleep 1
done

docker run --rm --network $NET \
    -e MINIO_HOST=http://$SRV:9000 -e MINIO_ACCESS_KEY=$AK -e MINIO_SECRET_KEY=$SK \
    -v "$SCRIPT":/tmp/minio.sh --entrypoint bash ghcr.io/openreplay/minio:2025 -c '
    bash /tmp/minio.sh init >/tmp/log 2>&1 || { cat /tmp/log; exit 1; }
    echo hi >/tmp/x.txt
    mc cp -q /tmp/x.txt minio/sessions-assets/a/x.txt >/dev/null' || {
    echo "FAIL: minio.sh init"
    exit 1
}

get=$(curl_code http://$SRV:9000/sessions-assets/a/x.txt)
list=$(curl_code "http://$SRV:9000/sessions-assets/?list-type=2")
mobs=$(curl_code "http://$SRV:9000/mobs/?list-type=2")
echo "rustfs=$TAG anon GET=$get anon LIST=$list anon LIST mobs=$mobs"

fail=0
[ "$get" = 200 ] || { echo "FAIL: anon GET sessions-assets object, want 200"; fail=1; }
[ "$list" = 403 ] || { echo "FAIL: anon LIST sessions-assets, want 403"; fail=1; }
[ "$mobs" = 403 ] || { echo "FAIL: anon LIST mobs, want 403"; fail=1; }
[ $fail = 0 ] && echo PASS
exit $fail
