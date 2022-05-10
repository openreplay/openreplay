### Prerequisites

- [Vagrant](../scripts/vagrant/README.md)
- Python 3.9
- Pipenv

### Development environment

```bash
cd openreplay/ee/api
# Make your own copy of .env file and edit it as you want
cp .env.dev .env

# Create a .venv folder to contain all you dependencies
mkdir .venv

# Installing dependencies (pipenv will detect the .venv folder and use it as a target)
pipenv install -r requirements.txt [--skip-lock]

# These commands must bu used everytime you make changes to FOSS.
# To clean the unused files before getting new ones
bash clean.sh
# To copy commun files from FOSS
bash prepare-dev.sh
```

### Building and deploying locally

```bash
cd openreplay-contributions
vagrant ssh
cd openreplay-dev/openreplay/scripts/helmcharts
# For complete list of options
# bash local_deploy.sh help
bash local_deploy.sh api
```
