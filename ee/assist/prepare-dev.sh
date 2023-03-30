#!/bin/bash
rsync -avr --exclude=".*" --exclude="node_modules" --ignore-existing ../../assist/* ./