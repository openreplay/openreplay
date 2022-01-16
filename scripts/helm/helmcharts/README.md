- Initialize databases
  - we've to pass the --wait flag, else the db installation won't be complete. and it'll break the db init.
  - collate all dbs required
    - How to distinguish b/w enterprise and community
    - Or fist only community then enterprise
- install db migration
  - have to have another helm chart with low hook value for higher prioriry
- install app
  - customize values.yaml file


## Installation
helm upgrade --install databases ./databases -n db --create-namespace --wait -f ./values.yaml --atomic
helm upgrade --install openreplay ./openreplay -n app --create-namespace --wait -f ./values.yaml --atomic
