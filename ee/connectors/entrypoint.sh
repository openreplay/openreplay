echo "[INFO] Service start"
python -u consumer_pool.py & python -u fill_from_db.py && fg
