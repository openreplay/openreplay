import time
import argparse
from decouple import config
from core import recommendation_model

import pandas
import json
import os


def transform_dict_string(s_dicts):
    data = list()
    for s_dict in s_dicts:
        data.append(json.loads(s_dict.replace("'", '"').replace('None','null').replace('False','false')))
    return data

def process_file(file_name):
    return pandas.read_csv(file_name, sep=",")


def read_batches():
    base_dir = config('dir_path', default='/opt/airflow/cache')
    files = os.listdir(base_dir)
    for file in files:
        yield process_file(f'{base_dir}/{file}')


parser = argparse.ArgumentParser(description='Handle machine learning inputs.')
parser.add_argument('--mode', choices=['train', 'test'], required=True, help='--mode sets the model in train or test mode')
parser.add_argument('--kernel', default='linear', help='--kernel set the kernel to be used for SVM')

args = parser.parse_args()

if __name__ == '__main__':
    print(args)
    t1 = time.time()
    buff = read_batches()
    for b in buff:
        print(b.head())
    t2 = time.time()
    print(f'DONE! information retrieved in {t2-t1: .2f} seconds')
