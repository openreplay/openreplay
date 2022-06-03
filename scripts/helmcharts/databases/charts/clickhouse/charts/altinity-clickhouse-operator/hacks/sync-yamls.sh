#!/usr/bin/env bash

#
# Script downloads manifest from altinity repo, splits it to separate files
#  and puts to the corresponding folders
# NOTE: yq ( https://mikefarah.gitbook.io/yq/ ) > v4.14.x is required
#
# Usage: ./sync.sh
#

set -o errexit
set -o nounset
set -o pipefail

readonly repo_url="https://raw.githubusercontent.com/Altinity/clickhouse-operator"
readonly crds_dir="../crds"
readonly templates_dir="../templates/generated"
readonly manifest_path="deploy/operator/clickhouse-operator-install-bundle.yaml"
readonly chart_def="../Chart.yaml"

function main() {
  readonly manifest_url="${repo_url}/$(detect_version)/${manifest_path}"
  local tmpdir
  tmpdir=$(mktemp -d)

  # shellcheck disable=SC2016
  (cd "${tmpdir}" && curl -s "${manifest_url}" 2>&1 | yq e --no-doc -s '$index')

  for f in "${tmpdir}"/*.yml; do
    process "${f}"
  done
}

function process() {
  local file="${1}"

  local kind
  kind=$(yq e '.kind' "${file}")

  local name
  name=$(yq e '.metadata.name' "${file}")

  local processed_file="${kind}-${name}.yaml"

  if [[ "${kind}" == "CustomResourceDefinition" ]]; then
    processed_file="${crds_dir}/${processed_file}"
  else
    processed_file="${templates_dir}/${processed_file}"
  fi

  mv "${file}" "${processed_file}"
}

function detect_version() {
  yq e '.appVersion' ${chart_def}
}

main
