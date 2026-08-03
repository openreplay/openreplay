REQUIRED_VERSION=$(sed -n 's/.*"@openreplay\/tracker": *">=\([0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\).*/\1/p' package.json | head -1)

if [ -z "$REQUIRED_VERSION" ]; then
  echo "reqver.sh: could not read the @openreplay/tracker peerDependencies floor from package.json" >&2
  exit 1
fi

for dir in lib cjs; do
  if [ -d "$dir" ]; then
    replace-in-files "$dir"/* --string='REQUIRED_TRACKER_VERSION' --replacement="$REQUIRED_VERSION"
  fi
done
