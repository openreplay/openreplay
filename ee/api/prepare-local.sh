#!/bin/bash
rsync -avr --exclude=".*" --ignore-existing ../../api/* ./