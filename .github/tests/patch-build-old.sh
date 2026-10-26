#!/usr/bin/env bash
# Dry-run the "Build" step of .github/workflows/patch-build-old.yaml with
# build scripts and git stubbed out; asserts which scripts get called.
# Usage: bash .github/tests/patch-build-old.sh [workflow file, default patch-build-old.yaml]
set -euo pipefail
wf=${1:-patch-build-old.yaml}
SERVICES=chalice,alerts,crons,frontend
root=$(git rev-parse --show-toplevel)
tmp=$(mktemp -d)
trap 'rm -rf $tmp' EXIT

# Fake repo layout
mkdir -p $tmp/repo/{backend/cmd/http,ee/backend/cmd/connector,api,frontend}
for c in chalice alerts utilities frontend http; do
  mkdir -p $tmp/repo/scripts/helmcharts/openreplay/charts/$c
  echo 'AppVersion: "v1.27.0"' >$tmp/repo/scripts/helmcharts/openreplay/charts/$c/Chart.yaml
done
mkdir -p $tmp/msaas/openreplay/{api,frontend,backend}

# Stubs: record every build invocation as "<dir>|<script args>|<tag>|<arch>"
cat >$tmp/run.sh <<'EOF'
bash() {
  echo "$(basename $PWD)|$*|$IMAGE_TAG|$ARCH" >>$CALLS
  [[ $1 != build_crons.sh || ${2:-} == ee ]] || return 100 # mirrors api/build_crons.sh
}
env() { # newer workflows wrap builds as `run_build env K=V bash ...`
  while [[ $1 == *=* ]]; do export "$1"; shift; done
  "$@"
}
git() { :; }
cp() { :; }
EOF
yq '.jobs.*.steps[] | select(.name == "Build") | .run' $root/.github/workflows/$wf |
  sed 's/\${{ github.event.inputs.services }}/'"$SERVICES"'/' >>$tmp/run.sh

export CALLS=$tmp/calls MSAAS_REPO_FOLDER=$tmp/msaas SERVICES_INPUT=$SERVICES BRANCH_NAME=test DOCKER_REPO_OSS=oss DOCKER_REPO_ARM=arm
(cd $tmp/repo && /bin/bash $tmp/run.sh >/dev/null 2>$tmp/err) ||
  { echo "FAIL: build step exited non-zero"; tail -3 $tmp/err; cat $CALLS; exit 1; }

fail=0
has() { grep -qxF "$1" $CALLS || { echo "FAIL: missing call: $1"; fail=1; }; }
hasnt() { ! grep -qF "$1" $CALLS || { echo "FAIL: unexpected call: $1"; fail=1; }; }
chart() { grep -q "AppVersion: \"$2\"" $tmp/repo/scripts/helmcharts/openreplay/charts/$1/Chart.yaml || { echo "FAIL: $1 chart not $2"; fail=1; }; }

has "api|build_crons.sh ee|v1.27.1-ee|amd64"
hasnt "build_crons.sh|"        # no FOSS crons build (exits 100)
has "api|build_alerts.sh|v1.27.1|amd64"
has "frontend|build.sh|v1.27.1|amd64" # script name must not leak from alerts
chart utilities v1.27.1
chart alerts v1.27.1
chart frontend v1.27.1
[[ $fail == 0 ]] && echo PASS || { cat $CALLS; exit 1; }
