## Getting setup

1. `yarn install`
2. Copy .env.local to .env and make any needed changes
3. `yarn start`

Debugging the various react components is handled best using the react developers browser extension.

## Deploying a new image

1. `./deploy.sh`
2. Update helm chart as needed in aven_infra/terraform/aven_aws/devops/charts/openreplay
3. Run the deploy on terraform
