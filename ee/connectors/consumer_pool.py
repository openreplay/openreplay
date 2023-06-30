from decouple import config, Csv
import asyncio
from db.api import DBConnection
from utils import pg_client
from utils.worker import WorkerPool

        
def main():
    DATABASE = config('CLOUD_SERVICE')
    database_api = DBConnection(DATABASE)

    allowed_projects = config('PROJECT_IDS', default=None, cast=Csv(int))
    w_pool = WorkerPool(n_workers=60,
                        project_filter=allowed_projects)
    try:
        w_pool.load_checkpoint(database_api)
    except Exception as e:
        print('[WORKER WARN] Checkpoint not found')
        print(repr(e))
    # ssl_protocol = config('KAFKA_USE_SSL', default=True, cast=bool)
    # consumer_settings = {
    #     "bootstrap.servers": config('KAFKA_SERVERS'),
    #     "group.id": f"connector_{DATABASE}",
    #     "auto.offset.reset": "earliest",
    #     "enable.auto.commit": False
    #     }
    # if ssl_protocol:
    #     consumer_settings['security.protocol'] = 'SSL'
    # consumer = Consumer(consumer_settings)

    # consumer.subscribe(config("TOPICS", default="saas-raw").split(','))
    print("[WORKER INFO] Kafka consumer subscribed")

    # w_pool.run_workers(kafka_consumer=consumer, database_api=database_api)
    w_pool.run_workers(database_api=database_api)


if __name__ == '__main__':
    asyncio.run(pg_client.init())
    main()

