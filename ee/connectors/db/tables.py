from pathlib import Path

base_path = Path(__file__).parent.parent


def create_tables_clickhouse(db):
    with open(base_path / 'sql' / 'clickhouse_events.sql') as f:
        q = f.read()
    db.engine.execute(q)
    print(f"`connector_user_events` table created succesfully.")

    with open(base_path / 'sql' / 'clickhouse_events_buffer.sql') as f:
        q = f.read()
    db.engine.execute(q)
    print(f"`connector_user_events_buffer` table created succesfully.")

    with open(base_path / 'sql' / 'clickhouse_sessions.sql') as f:
        q = f.read()
    db.engine.execute(q)
    print(f"`connector_sessions` table created succesfully.")

    with open(base_path / 'sql' / 'clickhouse_sessions_buffer.sql') as f:
        q = f.read()
    db.engine.execute(q)
    print(f"`connector_sessions_buffer` table created succesfully.")

    #with open(base_path / 'sql' / 'clickhouse_events_detailed.sql') as f:
    #    q = f.read()
    #db.engine.execute(q)
    #print(f"`connector_user_events_detailed` table created succesfully.")

    #with open(base_path / 'sql' / 'clickhouse_events_detailed_buffer.sql') as f:
    #    q = f.read()
    #db.engine.execute(q)
    #print(f"`connector_user_events_detailed_buffer` table created succesfully.")


def create_tables_postgres(db):
    with open(base_path / 'sql' / 'postgres_events.sql') as f:
        q = f.read()
    db.engine.execute(q)
    print(f"`connector_user_events` table created succesfully.")

    with open(base_path / 'sql' / 'postgres_sessions.sql') as f:
        q = f.read()
    db.engine.execute(q)
    print(f"`connector_sessions` table created succesfully.")

    #with open(base_path / 'sql' / 'postgres_events_detailed.sql') as f:
    #    q = f.read()
    #db.engine.execute(q)
    #print(f"`connector_user_events_detailed` table created succesfully.")


def create_tables_snowflake(db):
    with open(base_path / 'sql' / 'snowflake_events.sql') as f:
        q = f.read()
    db.engine.execute(q)
    print(f"`connector_user_events` table created succesfully.")

    with open(base_path / 'sql' / 'snowflake_sessions.sql') as f:
        q = f.read()
    db.engine.execute(q)
    print(f"`connector_sessions` table created succesfully.")

    #with open(base_path / 'sql' / 'snowflake_events_detailed.sql') as f:
    #    q = f.read()
    #db.engine.execute(q)
    #print(f"`connector_user_events_detailed` table created succesfully.")


def create_tables_redshift(db):
    with open(base_path / 'sql' / 'redshift_events.sql') as f:
        q = f.read()
    db.engine.execute(q)
    print(f"`connector_user_events` table created succesfully.")

    with open(base_path / 'sql' / 'redshift_sessions.sql') as f:
        q = f.read()
    db.engine.execute(q)
    print(f"`connector_sessions` table created succesfully.")
   
    #with open(base_path / 'sql' / 'redshift_events_detailed.sql') as f:
    #    q = f.read()
    #db.engine.execute(q)
    #print(f"`connector_user_events_detailed` table created succesfully.")
