#!/bin/sh

# This script will rplace the env variable values to the config files

ls config/
find /quickwit/ -type f -name "*.yaml" -exec sed -i "s#{{KAFKA_SERVER}}#${KAFKA_SERVER}#g" {} \;
find /quickwit/ -type f -name "*.yaml" -exec sed -i "s#{{AWS_BUCKET}}#${AWS_BUCKET}#g" {} \;
find /quickwit/ -type f -name "*.yaml" -exec sed -i "s/{{QUICKWIT_TOPIC}}/${QUICKWIT_TOPIC}/g" {} \;
find /quickwit/ -type f -name "*.yaml" -exec sed -i "s/{{QUICKWIT_PORT}}/${QUICKWIT_PORT}/g" {} \;
find /quickwit/ -type f -name "*.yaml" -exec sed -i "s#{{data_dir_path}}#${data_dir_path}#g" {} \;

./quickwit_start_task.sh & ./setup_indexes_and_worker.sh && fg
