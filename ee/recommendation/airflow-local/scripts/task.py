import argparse
from core import recommendation
from utils import pg_client
import asyncio

#TODO: remove this module
import pandas as pd

parser = argparse.ArgumentParser(description='Handle machine learning inputs.')
parser.add_argument('--mode', choices=['train', 'test'], required=True, help='--mode sets the model in train or test mode')
parser.add_argument('--kernel', default='linear', help='--kernel set the kernel to be used for SVM')

args = parser.parse_args()

if __name__ == '__main__':
    asyncio.run(pg_client.init())
    data1 = recommendation.query_funnels()
    print(pd.DataFrame(data1))
    data2 = recommendation.query_with_filters()
    print(pd.DataFrame(data2))
    data3 = recommendation.query_metrics()
    print(pd.DataFrame(data3))
    print(args)
