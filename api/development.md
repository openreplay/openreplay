## Prerequisites

- [Vagrant](../scripts/vagrant/README.md)
- Python 3.9
- Pipenv

### Development environment

```bash
cd openreplay/api
# Make your own copy of .env file and edit it as you want
cp .env.dev .env

# Create a .venv folder to contain all you dependencies
mkdir .venv

# Installing dependencies (pipenv will detect the .venv folder and use it as a target)
pipenv install -r requirements.txt [--skip-lock]
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


## CheatSheet

### `import contextvars`

```python
import contextvars

my_variable: contextvars.ContextVar[str] = contextvars.ContextVar('my_variable')
my_variable.set('foobar')
assert my_variable.get() == 'foobar'
```

### `import httpx`

Mostly like requests. Look at the doc at: https://www.python-httpx.org/asynpg/

### `import psycopg3`

[Basic connection pool usage](https://www.psycopg.org/psycopg3/docs/advanced/pool.html#basic-connection-pool-usage)
