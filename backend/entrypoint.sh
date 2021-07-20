#!/bin/bash

for name in alerts assets db ender http integrations sink storage;do nohup bin/$name &> /tmp/${name}.log ; done