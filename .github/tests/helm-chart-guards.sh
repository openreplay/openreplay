#!/usr/bin/env bash
# Checks the install guards of the openreplay/databases charts and the
# OCI package produced by `make -C scripts/helmcharts package`.
# Needs: helm, yq, templater.
# Usage: bash .github/tests/helm-chart-guards.sh
set -uo pipefail
root=$(git rev-parse --show-toplevel)
charts=$root/scripts/helmcharts
V=1.28.0
tmp=$(mktemp -d)
trap 'rm -rf $tmp' EXIT
fails=0

ok() { echo "PASS $1"; }
ko() { echo "FAIL $1"; fails=$((fails + 1)); }
# expect_fail <name> <needle> <cmd...>: cmd must fail and print needle
expect_fail() {
  local name=$1 needle=$2; shift 2
  if out=$("$@" 2>&1); then ko "$name (rendered, expected failure)"; return; fi
  grep -qF -- "$needle" <<<"$out" && ok "$name" || ko "$name (missing '$needle' in: ${out:0:300})"
}
expect_ok() {
  local name=$1; shift
  out=$("$@" 2>&1) && ok "$name" || ko "$name (${out:0:300})"
}

templater -i $charts/vars.yaml -o $tmp/vars.yaml >/dev/null
cp $charts/vars.yaml $tmp/raw-vars.yaml

for c in databases openreplay; do
  # (a) no vars.yaml: fail with instructions
  expect_fail "a/$c no -f: download hint" "curl -sLO https://raw.githubusercontent.com/openreplay/openreplay/" \
    helm template $c $charts/$c
  expect_fail "a/$c no -f: templater hint" "templater -i vars.yaml -o vars.yaml" \
    helm template $c $charts/$c
  expect_fail "a/$c no -f: oci install hint" "oci://public.ecr.aws/op3nr3play/helm/$c" \
    helm template $c $charts/$c
  # (b) vars.yaml passed but not templated
  expect_fail "b/$c raw vars.yaml" "vars.yaml is not templated" \
    helm template $c $charts/$c -f $tmp/raw-vars.yaml
  # (c) templated vars.yaml renders
  expect_ok "c/$c templated vars.yaml" helm template $c $charts/$c -f $tmp/vars.yaml
done

# (d) published package
make -s -n -C $charts publish VERSION=$V DEST=$tmp/pkg 2>&1 |
  grep -q "helm push .* oci://public.ecr.aws/op3nr3play/helm" &&
  ok "d/publish targets op3nr3play" || ko "d/publish targets op3nr3play"
before=$(git -C $root status --porcelain -- scripts/helmcharts)
expect_ok "d/make package" make -C $charts package VERSION=$V DEST=$tmp/pkg
after=$(git -C $root status --porcelain -- scripts/helmcharts)
[[ $before == "$after" ]] && ok "d/source tree untouched" || ko "d/source tree modified: $after"
[[ $(yq '.offlineMigration.enabled' $charts/openreplay/values.yaml) == false ]] &&
  ok "d/source offlineMigration stays false" || ko "d/source offlineMigration changed"

for c in databases openreplay; do
  tgz=$tmp/pkg/$c-$V.tgz
  [[ -f $tgz ]] || { ko "d/$c package missing ($tgz)"; continue; }
  [[ $(helm show chart $tgz | yq .version) == "$V" ]] && ok "d/$c version" || ko "d/$c version"
  [[ $(helm show chart $tgz | yq .appVersion) == "v$V" ]] && ok "d/$c appVersion" || ko "d/$c appVersion"
  expect_fail "d/$c package keeps guard" "templater -i vars.yaml -o vars.yaml" helm template $c $tgz
done

tgz=$tmp/pkg/openreplay-$V.tgz
if [[ -f $tgz ]]; then
  vals=$(helm show values $tgz)
  [[ $(yq .offlineMigration.enabled <<<"$vals") == true ]] && ok "d/offlineMigration enabled" || ko "d/offlineMigration not enabled"
  [[ $(yq .offlineMigration.image.registry <<<"$vals") == ghcr.io/openreplay ]] && ok "d/image path unchanged" || ko "d/image path changed"
  helm template openreplay $tgz -f $tmp/vars.yaml 2>&1 | grep -q "image: \"ghcr.io/openreplay/migration:v$V\"" &&
    ok "d/job uses migration:v$V" || ko "d/job does not use migration:v$V"
fi

echo "---"
[[ $fails -eq 0 ]] && echo "ALL PASS" || { echo "$fails FAILED"; exit 1; }
