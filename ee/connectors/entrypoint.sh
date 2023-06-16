echo "[INFO] Starting service"
python -u fill_from_db.py
python -u consumer_async.py
