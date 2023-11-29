#!/bin/bash

set -xe

sudo -u postgres createuser orpy || true
echo 'DROP DATABASE IF EXISTS orpy' | sudo -u postgres psql
sudo -u postgres createdb orpy || true
echo "alter user orpy with encrypted password 'orpy';" | sudo -u postgres psql
echo "grant all privileges on database orpy to orpy ;" | sudo -u postgres psql

psql -W -U orpy < $1
