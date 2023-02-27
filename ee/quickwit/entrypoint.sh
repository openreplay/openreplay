#!/bin/sh

# This script will rplace the env variable values to the config files

ls config/
find /quickwit/ -type f -name "*.yaml" -exec sed -i "s#{{KAFKA_SERVER}}#${KAFKA_SERVER}#g" {} \;
find /quickwit/ -type f -name "*.yaml" -exec sed -i "s#{{AWS_BUCKET}}#${AWS_BUCKET}#g" {} \;
find /quickwit/ -type f -name "*.yaml" -exec sed -i "s/{{QUICKWIT_TOPIC}}/${QUICKWIT_TOPIC}/g" {} \;
find /quickwit/ -type f -name "*.yaml" -exec sed -i "s#{{data_dir_path}}#${data_dir_path}#g" {} \;

quickwit index create --index-config index-config-fetch.yaml --config s3-config.yaml
quickwit index create --index-config index-config-graphql.yaml --config s3-config.yaml
quickwit index create --index-config index-config-pageevent.yaml --config s3-config.yaml

quickwit source delete --index fetchevent --source fetch-kafka --config s3-config.yaml
quickwit source delete --index graphql --source graphql-kafka --config s3-config.yaml
quickwit source delete --index pageevent --source pageevent-kafka --config s3-config.yaml


if [${filter} == "false"]; then
	quickwit source create --index fetchevent --source-config source-fetch.yaml --config s3-config.yaml
	quickwit source create --index graphql --source-config source-graphql.yaml --config s3-config.yaml
	quickwit source create --index pageevent --source-config source-pageevent.yaml --config s3-config.yaml
	quickwit run --config s3-config-listen.yaml
else
	quickwit run --config s3-config-listen.yaml & python3 consumer.py && fg
fi
