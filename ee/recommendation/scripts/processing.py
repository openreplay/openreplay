import time
import argparse
from core import features
from utils import pg_client
import multiprocessing as mp
from decouple import config
import asyncio
import pandas


def features_ch(q):
    q.put(features.get_features_clickhouse())

def features_pg(q):
    q.put(features.get_features_postgres())

def get_features():
    #mp.set_start_method('spawn')
    #q = mp.Queue()
    #p1 = mp.Process(target=features_ch, args=(q,))
    #p1.start()
    pg_features = features.get_features_postgres()
    ch_features = []#p1.join()
    return [pg_features, ch_features]


parser = argparse.ArgumentParser(description='Gets and process data from Postgres and ClickHouse.')
parser.add_argument('--batch_size', type=int, required=True, help='--batch_size max size of columns per file to be saved in opt/airflow/cache')

args = parser.parse_args()

if __name__ == '__main__':
    asyncio.run(pg_client.init())
    print(args)
    t1 = time.time()
    data = get_features()
    #print(data)
    cache_dir = config("data_dir", default=f"/opt/airflow/cache")
    for d in data[0]:
        pandas.DataFrame(d).to_csv(f'{cache_dir}/tmp-{hash(time.time())}', sep=',')
    t2 = time.time()
    print(f'DONE! information retrieved in {t2-t1: .2f} seconds')
