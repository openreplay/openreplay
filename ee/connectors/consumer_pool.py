from decouple import config, Csv
import signal
# import asyncio
from db.api import DBConnection
# from utils import pg_client
from utils.worker import WorkerPool

        
def main():
    DATABASE = config('CLOUD_SERVICE')
    database_api = DBConnection(DATABASE)

    allowed_projects = config('PROJECT_IDS', default=None, cast=Csv(int))
    w_pool = WorkerPool(n_workers=config('OR_EE_CONNECTOR_WORKER_COUNT', cast=int, default=60),
                        project_filter=allowed_projects)
    try:
        w_pool.load_checkpoint(database_api)
    except Exception as e:
        print('[WORKER WARN] Checkpoint not found')
        print(repr(e))

    print("[WORKER INFO] Kafka consumer subscribed")

    w_pool.run_workers(database_api=database_api)


if __name__ == '__main__':
    # asyncio.run(pg_client.init())
    main()
    raise Exception('Script terminated')

