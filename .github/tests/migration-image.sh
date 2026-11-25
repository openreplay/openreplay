#!/usr/bin/env bash
# Checks the standalone migration image workflow and the image it builds.
# The image is what the published chart uses with offlineMigration.enabled,
# so it must be rebuilt from main on every schema change and tagged with
# the openreplay chart AppVersion.
# Needs: yq, actionlint, docker (set SKIP_DOCKER=1 to skip the image build).
# Usage: bash .github/tests/migration-image.sh
set -uo pipefail
root=$(git rev-parse --show-toplevel)
wf=$root/.github/workflows/migration-image.yaml
base=$root/.github/workflows/build-base-images.yaml
tmp=$(mktemp -d)
trap 'rm -rf $tmp' EXIT
fails=0
ok() { echo "PASS $1"; }
ko() { echo "FAIL $1"; fails=$((fails + 1)); }
cd $root

if [[ ! -f $wf ]]; then
  ko "workflow $wf missing"
else
  # Triggers: push to main on schema changes, plus manual backfill
  [[ $(yq '.on.push.branches | join(",")' $wf) == main ]] && ok "push trigger only on main" || ko "push trigger branches: $(yq '.on.push.branches' $wf)"
  for p in 'scripts/schema/**' 'ee/scripts/schema/**' 'scripts/dockerfiles/migration/**' 'scripts/helmcharts/openreplay/Chart.yaml'; do
    yq -e ".on.push.paths[] | select(. == \"$p\")" $wf >/dev/null 2>&1 && ok "path filter $p" || ko "path filter $p missing"
  done
  yq -e '.on | has("workflow_dispatch")' $wf >/dev/null 2>&1 && ok "workflow_dispatch" || ko "workflow_dispatch missing"

  # Version step, run for real: tag comes from Chart.yaml AppVersion
  run=$(yq '.jobs[].steps[] | select(.id == "version") | .run' $wf)
  if [[ -z $run || $run == null ]]; then
    ko "step id=version missing"
  else
    GITHUB_OUTPUT=$tmp/out bash -e -c "$run" >/dev/null 2>&1
    want=$(yq '.AppVersion' scripts/helmcharts/openreplay/Chart.yaml)
    got=$(sed -n 's/^version=//p' $tmp/out 2>/dev/null)
    [[ -n $want && $got == "$want" ]] && ok "version step outputs $want" || ko "version step output '$got', want '$want'"
  fi

  # Build step pushes both arches to the path the chart pulls from
  b='.jobs[].steps[] | select(.uses == "depot/build-push-action*")'
  [[ $(yq "$b | .with.context" $wf) == . ]] && ok "context is repo root" || ko "context: $(yq "$b | .with.context" $wf)"
  [[ $(yq "$b | .with.file" $wf) == scripts/dockerfiles/migration/Dockerfile ]] && ok "dockerfile" || ko "dockerfile: $(yq "$b | .with.file" $wf)"
  plat=$(yq "$b | .with.platforms" $wf)
  [[ $plat == *linux/amd64* && $plat == *linux/arm64* ]] && ok "platforms amd64+arm64" || ko "platforms: $plat"
  [[ $(yq "$b | .with.push" $wf) == true ]] && ok "push enabled" || ko "push not enabled"
  [[ $(yq "$b | .with.tags" $wf) == 'ghcr.io/openreplay/migration:${{ steps.version.outputs.version }}' ]] &&
    ok "tag ghcr.io/openreplay/migration:<AppVersion>" || ko "tags: $(yq "$b | .with.tags" $wf)"

  out=$(actionlint "$wf" 2>&1) && ok "actionlint" || ko "actionlint: ${out:0:400}"
fi

# The weekly dev build must no longer produce the migration image:
# it would overwrite the release tag with unreleased dev schemas.
grep -qi migration $base && ko "build-base-images.yaml still builds migration: $(grep -n -i migration $base | head -3)" || ok "migration removed from build-base-images"

# Image contains the schemas at the paths job.yaml copies from
if [[ ${SKIP_DOCKER:-0} == 1 ]]; then
  echo "SKIP docker build"
else
  img=migration-test:local
  if docker build -q -t $img -f scripts/dockerfiles/migration/Dockerfile . >/dev/null 2>&1; then
    for f in /work/scripts/schema/db/init_dbs/postgresql/init_schema.sql /work/ee/scripts/schema/db/init_dbs/postgresql/init_schema.sql; do
      docker run --rm $img test -f $f && ok "image has $f" || ko "image missing $f"
    done
    docker run --rm $img bash -c 'command -v nc && command -v git' >/dev/null && ok "image has nc and git" || ko "image missing nc/git"
    docker rmi -f $img >/dev/null 2>&1
  else
    ko "docker build failed"
  fi
fi

echo "---"
[[ $fails -eq 0 ]] && echo "ALL PASS" || { echo "$fails FAILED"; exit 1; }
