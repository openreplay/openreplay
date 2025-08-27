#!/bin/bash

# Script to read all *-openreplay.yaml files in yamls/ directory, check for valueFrom.secretKeyRef, replace valueFrom with value: decoded_value

for file in yamls/*-openreplay.yaml; do
    if grep -q "secretKeyRef" "$file"; then
        echo "processing $file"
        pairs=$(yq eval '.spec.template.spec.containers[0].env[] | select(has("valueFrom")) | .name + ":" + .valueFrom.secretKeyRef.key' "$file")
        for pair in $pairs; do
            name=$(echo "$pair" | cut -d: -f1)
            key=$(echo "$pair" | cut -d: -f2-)
            secret_value=$(yq eval ".data.$key" "yamls/or-secrets.yaml")
            decoded_value=$(echo "$secret_value" | base64 -d)
            # Delete valueFrom
            yq eval -i "del(.spec.template.spec.containers[0].env[] | select(.name == \"$name\") | .valueFrom)" "$file"
            # Set value
            yq eval -i "(.spec.template.spec.containers[0].env[] | select(.name == \"$name\") | .value) = \"$decoded_value\"" "$file"
        done
    fi
done
