#!/bin/sh

echo "hifromentrypoint" 

for name in alerts assets db ender http integrations sink storage;do nohup bin/$name | awk -v log_from="[$name]: " '{print log_from, $0}' ; done