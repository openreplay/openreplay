## How to build and run an application from local

### For workers

Workers are the application which handle core functionalities.

- List of workers are
  - alerts
  - assets
  - db
  - ender
  - http
  - integrations
  - sink
  - storage

- Build: 
  ```
  cd openreplay/backend
  # IMAGE_TAG=<version of openreplay, check in vars.yaml> DOCKER_REPO=rg.fr-par.scw.cloud/foss bash build.sh <worker_name>
  # For example,
  IMAGE_TAG=v1.0.0 DOCKER_REPO=rg.fr-par.scw.cloud/foss bash build.sh assets
  ```
- Deploy:
  ```
  cd openreplay/scripts/helm
  bash openreplay-cli --install <worker_name>
  ```
## For api 
  
All apis are handled by application called, chalice, which is a python3 application.

- Build:
  ```
  cd openreplay/api/
  # IMAGE_TAG=<version of openreplay, check in vars.yaml> DOCKER_REPO=rg.fr-par.scw.cloud/foss bash build.sh
  # For example,
  IMAGE_TAG=v1.0.0 DOCKER_REPO=rg.fr-par.scw.cloud/foss bash build.sh
  ```
- Deploy:
  ```
  cd openreplay/scripts/helm
  bash openreplay-cli --install chalice
  ```
  
## For frontend

Frontend is mainly JS components. When we're installing it, it's built and then installed. So you don't have to run a separate build for frontend.

Note: if you want to see how it gets build, please refer, `openreplay/frontend/build.sh`

- Build and Deploy:
  ```
  cd openreplay/scripts/helm
  bash openreplay-cli --install frontend
  ```
