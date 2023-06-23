from datetime import datetime
from db.writer import insert_batch, update_batch
from psycopg2 import InterfaceError
from time import sleep


def insertBatch(events_batch, sessions_insert_batch, sessions_update_batch, db, sessions_table_name, table_name, EVENT_TYPE):
    t1 = datetime.now().timestamp()
    print(f'[BG-INFO] Number of events to add {len(events_batch)}, number of sessions to add {len(sessions_insert_batch)}, number of sessions to update {len(sessions_update_batch)}')
    if sessions_insert_batch:
        attempt_session_insert(sessions_insert_batch, db, sessions_table_name)

    if sessions_update_batch:
        attempt_session_update(sessions_update_batch, db, sessions_table_name)

    if events_batch:
        attempt_batch_insert(events_batch, db, table_name, EVENT_TYPE)
    print(f'[BG-INFO] Uploaded into S3 in {datetime.now().timestamp()-t1} seconds')


def attempt_session_insert(sess_batch, db, sessions_table_name, try_=0):
    if sess_batch:
        try:
            insert_batch(db, sess_batch, table=sessions_table_name, level='sessions')
        except TypeError as e:
            print("Type conversion error")
            print(repr(e))
        except ValueError as e:
            print("Message value could not be processed or inserted correctly")
            print(repr(e))
        except InterfaceError as e:
            if try_ < 3:
                try_ += 1
                sleep(try_*2)
                attempt_session_insert(sess_batch, db, sessions_table_name, try_)
        except Exception as e:
            print(repr(e))


def attempt_session_update(sess_batch, db, sessions_table_name):
    if sess_batch:
        try:
            update_batch(db, sess_batch, table=sessions_table_name)
        except TypeError as e:
            print('Type conversion error')
            print(repr(e))
        except ValueError as e:
            print('Message value could not be processed or inserted correctly')
            print(repr(e))
        except InterfaceError as e:
            print('Error while trying to update session into datawarehouse')
            print(repr(e))
        except Exception as e:
            print(repr(e))


def attempt_batch_insert(events_batch, db, table_name, EVENT_TYPE, try_=0):
    try:
        insert_batch(db=db, batch=events_batch, table=table_name, level=EVENT_TYPE)
    except TypeError as e:
        print("Type conversion error")
        print(repr(e))
    except ValueError as e:
        print("Message value could not be processed or inserted correctly")
        print(repr(e))
    except InterfaceError as e:
        if try_ < 3:
            try_ += 1
            sleep(try_*2)
            attempt_batch_insert(events_batch, db, table_name, EVENT_TYPE, try_)
        elif try_ == 3:
            db.restart()
            sleep(2)
            attempt_batch_insert(events_batch, db, table_name, EVENT_TYPE, try_ + 1)
        else:
            print(repr(e))
    except Exception as e:
        print(repr(e))

