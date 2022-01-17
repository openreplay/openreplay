## Installation
helm upgrade --install databases ./databases -n db --create-namespace --wait -f ./values.yaml --atomic

helm upgrade --install openreplay ./openreplay -n app --create-namespace --wait -f ./values.yaml --atomic
