from decouple import config
import logging

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))