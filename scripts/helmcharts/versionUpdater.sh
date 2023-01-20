#!/bin/bash
# This script will update the version of openreplay components.
currentVersion=$1
[[ -z $currentVersion ]] && {
    echo "Usage: $0 <appversion>"
    echo "eg: $0 v1.5.0"
}
find ./openreplay -type f -iname chart.yaml -exec sed -i "s/AppVersion.*/AppVersion: \"$currentVersion\"/g" {} \;
sed -i "s/fromVersion.*/fromVersion: \"$currentVersion\"/g" vars.yaml
sed -i "s/version=.*/version=\"$currentVersion\"/g" init.sh
