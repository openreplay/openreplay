- Initialize databases
  - we've to pass the --wait flag, else the db installation won't be complete. and it'll break the db init.

## Installation
helm upgrade --install databases ./databases -n db --create-namespace --wait -f ./values.yaml --atomic

helm upgrade --install openreplay ./openreplay -n app --create-namespace --wait -f ./values.yaml --atomic
