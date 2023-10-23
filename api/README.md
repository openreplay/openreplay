# openreplay @ api

## Getting started

1. Setup postgresql with an username, password, and database;
1. Install the schema found at `~openreplay/scripts/schema/db/init_dbs/postgresql/init_schema.sql`

   ```shell
   psql --username=USERNAME --password --dbname=DBNAME < ~openreplay/scripts/schema/db/init_dbs/postgresql/init_schema.sql
   ```

1. Create a python virtual environment, install dependencies:

   ```shell
   python3 -m venv .venv
   pip install -r requirements.txt
   ```

1. Copy and customize the environment:

  ```shell
  cp env.dev .env
  $EDITOR .env
  ```
   
1. Start the backend server in development mode

   ```shell
   uvicorn --reload app:app --log-level ${LOGLEVEL:-warning}
   ```
