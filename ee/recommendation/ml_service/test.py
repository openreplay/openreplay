import os
import asyncio
os.environ['pg_host_ml'] = 'localhost'
os.environ['pg_port_ml'] = '9201'
os.environ['pg_user_ml'] = 'ml_user'
os.environ['pg_dbname_ml'] = 'mlruns'
os.environ['pg_password_ml'] = 'BBjV5oLUoU'

os.environ['pg_host']='localhost'
os.environ['pg_port']='9201'
os.environ['pg_user']='app_reader'
os.environ['pg_password']='Tnhqpd4jnS'
os.environ['pg_dbname']='app'
from utils import pg_client
asyncio.run(pg_client.init())
from core.model_handler import recommendation_model
recommendations = recommendation_model.get_recommendations(6641, 6251)
print(recommendations)
