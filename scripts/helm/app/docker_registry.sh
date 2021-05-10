#!/bin/bash
DOCKER_REGISTRY_SERVER=998611063711.dkr.ecr.eu-central-1.amazonaws.com
DOCKER_USER=AWS
AWS_REGION=eu-central-1
DOCKER_PASSWORD=`aws ecr get-login-password --region eu-central-1`
kubectl delete -n app secret aws-registry
kubectl create secret -n app docker-registry aws-registry \
              --docker-server=$DOCKER_REGISTRY_SERVER \
              --docker-username=$DOCKER_USER \
              --docker-password=$DOCKER_PASSWORD \
              --docker-email=no@email.local
