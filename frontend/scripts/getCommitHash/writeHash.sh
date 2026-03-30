# get latest commit hash and write it to a file
COMMIT_HASH=$(git rev-parse HEAD)
echo $COMMIT_HASH
