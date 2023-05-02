from pathlib import Path
from decouple import config

base_path = Path(__file__).parent.parent
EVENT_TYPE = config('EVENT_TYPE', default='normal')

def create_tables_clickhouse(db):
    if EVENT_TYPE == 'normal':
        with open(base_path / 'sql' / 'clickhouse_events.sql', 'r') as f:
            q = f.read()
        with db.get_live_session() as conn:
            conn.execute(q)
        print(f"`connector_user_events` table created succesfully.")

        with open(base_path / 'sql' / 'clickhouse_events_buffer.sql', 'r') as f:
            q = f.read()
        with db.get_live_session() as conn:
            conn.execute(q)
        print(f"`connector_user_events_buffer` table created succesfully.")

    with open(base_path / 'sql' / 'clickhouse_sessions.sql', 'r') as f:
        q = f.read()
    with db.get_live_session() as conn:
        conn.execute(q)
    print(f"`connector_sessions` table created succesfully.")

    with open(base_path / 'sql' / 'clickhouse_sessions_buffer.sql', 'r') as f:
        q = f.read()
    with db.get_live_session() as conn:
        conn.execute(q)
    print(f"`connector_sessions_buffer` table created succesfully.")

    if EVENT_TYPE == 'detailed':
        with open(base_path / 'sql' / 'clickhouse_events_detailed.sql') as f:
            q = f.read()
        with db.get_live_session() as conn: conn.execute(q)
        print(f"`connector_user_events_detailed` table created succesfully.")
    
        with open(base_path / 'sql' / 'clickhouse_events_detailed_buffer.sql') as f:
            q = f.read()
        with db.get_live_session() as conn: conn.execute(q)
        print(f"`connector_user_events_detailed_buffer` table created succesfully.")


def create_tables_postgres(db):
    if EVENT_TYPE == 'normal':
        with open(base_path / 'sql' / 'postgres_events.sql', 'r') as f:
            q = f.read()
        with db.get_live_session() as conn:
            conn.execute(q)
        print(f"`connector_user_events` table created succesfully.")

    with open(base_path / 'sql' / 'postgres_sessions.sql', 'r') as f:
        q = f.read()
    with db.get_live_session() as conn:
        conn.execute(q)
    print(f"`connector_sessions` table created succesfully.")

    if EVENT_TYPE == 'detailed':
        with open(base_path / 'sql' / 'postgres_events_detailed.sql') as f:
            q = f.read()
        with db.get_live_session() as conn: conn.execute(q)
        print(f"`connector_user_events_detailed` table created succesfully.")


def create_tables_snowflake(db):

    if EVENT_TYPE == 'normal':
        with open(base_path / 'sql' / 'snowflake_events.sql', 'r') as f:
            q = f.read()
        with db.get_live_session() as conn:
            conn.execute(q)
        print(f"`connector_user_events` table created succesfully.")

    with open(base_path / 'sql' / 'snowflake_sessions.sql', 'r') as f:
        q = f.read()
    with db.get_live_session() as conn:
        conn.execute(q)
    print(f"`connector_sessions` table created succesfully.")

    if EVENT_TYPE == 'detailed':
        with open(base_path / 'sql' / 'snowflake_events_detailed.sql') as f:
            q = f.read()
        with db.get_live_session() as conn: conn.execute(q)
        print(f"`connector_user_events_detailed` table created succesfully.")


def create_tables_redshift(db):
    if EVENT_TYPE == 'normal':
        with open(base_path / 'sql' / 'redshift_events.sql', 'r') as f:
            q = f.read()
        with db.get_live_session() as conn:
            conn.execute(q)
        print(f"`connector_user_events` table created succesfully.")

    with open(base_path / 'sql' / 'redshift_sessions.sql', 'r') as f:
        q = f.read()
    with db.get_live_session() as conn:
        conn.execute(q)
    print(f"`connector_sessions` table created succesfully.")
   
    if EVENT_TYPE == 'detailed':
        with open(base_path / 'sql' / 'redshift_events_detailed.sql') as f:
            q = f.read()
        with db.get_live_session() as conn: conn.execute(q)
        print(f"`connector_user_events_detailed` table created succesfully.")

