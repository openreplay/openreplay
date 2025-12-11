#!/bin/sh

for name in assets alerts  db ender http integrations sink storage;do (nohup bin/$name | awk -v log_from="[$name]: " '{print log_from, $0}') & done
wait