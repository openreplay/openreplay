#!/usr/bin/env bash
# Runs the update-keys composite action against a copy of the charts the way
# CI does, then renders the workers.yaml deploy command and checks the
# vars.yaml guard and the injected secrets.
# Each env var of a step bound to `inputs.<name>` gets the value "dummy-<name>".
# Steps that download tools (wget/curl) are skipped; yq + templater must be local.
# Needs: helm, yq, templater.
# Usage: bash .github/tests/update-keys.sh
set -uo pipefail
root=$(git rev-parse --show-toplevel)
action=$root/.github/composite-actions/update-keys/action.yml
tmp=$(mktemp -d)
trap 'rm -rf $tmp' EXIT
fails=0
ok() { echo "PASS $1"; }
ko() { echo "FAIL $1"; fails=$((fails + 1)); }

mkdir -p $tmp/scripts
cp -r $root/scripts/helmcharts $tmp/scripts/

# Run every non-download step of the action, in order, from the repo root copy.
n=$(yq '.runs.steps | length' $action)
for ((i = 0; i < n; i++)); do
  run=$(yq ".runs.steps[$i].run // \"\"" $action)
  [[ -z $run ]] && continue
  grep -qE 'wget|curl' <<<"$run" && continue
  envs=()
  while IFS=$'\t' read -r k v; do
    [[ -z $k ]] && continue
    if [[ $v =~ inputs\.([a-z_]+) ]]; then envs+=("$k=dummy-${BASH_REMATCH[1]}"); else envs+=("$k=$v"); fi
  done < <(yq ".runs.steps[$i].env // {} | to_entries[] | .key + \"\t\" + .value" $action)
  (cd $tmp && env "${envs[@]}" bash -e -c "$run") >$tmp/step$i.log 2>&1 ||
    ko "step $i ($(yq ".runs.steps[$i].name" $action)) failed: $(tail -3 $tmp/step$i.log)"
done

vars=$tmp/scripts/helmcharts/vars.yaml
grep -q randAlphaNum $vars && ko "vars.yaml still has randAlphaNum: $(grep -n randAlphaNum $vars | head -3)" || ok "vars.yaml fully templated"

# workers.yaml deploy command (renders hooks, so or-secrets is applied)
cd $tmp/scripts/helmcharts
if out=$(helm template openreplay -n app openreplay -f vars.yaml --set ingress-nginx.enabled=false --set skipMigration=true 2>&1); then
  ok "openreplay guard passes"
  secret() { yq "select(.kind==\"Secret\" and .metadata.name==\"or-secrets\") | .data[\"$1\"]" <<<"$out" | base64 -d; }
  for kv in jwt-mcp-secret=dummy-jwt_mcp_secret jwt-secret=dummy-jwt_secret postgresql-password=dummy-pg_password; do
    k=${kv%%=*} want=${kv#*=} got=$(secret $k)
    [[ $got == "$want" ]] && ok "or-secrets $k" || ko "or-secrets $k = '$got', want '$want'"
  done
else
  ko "openreplay guard: ${out:0:400}"
fi
# databases is not rendered: no CI workflow deploys it (only openreplay).

# Every workflow call site passes the MCP secret
cd $root
for wf in $(grep -rl "composite-actions/update-keys" .github/workflows); do
  calls=$(grep -c "composite-actions/update-keys" $wf)
  passed=$(grep -cF 'jwt_mcp_secret: ${{ secrets.JWT_MCP_SECRET }}' $wf)
  [[ $calls == "$passed" ]] && ok "$wf passes jwt_mcp_secret" || ko "$wf: $passed/$calls call sites pass jwt_mcp_secret"
done

echo "---"
[[ $fails -eq 0 ]] && echo "ALL PASS" || { echo "$fails FAILED"; exit 1; }
