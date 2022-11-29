echo 'Setting up required modules..'
mkdir scripts
mkdir plugins
mkdir logs
mkdir scripts/utils
cp ../../api/chalicelib/utils/pg_client.py scripts/utils
cp ../api/chalicelib/utils/ch_client.py scripts/utils
echo 'Building containers...'
docker-compose up airflow-init
echo 'Running containers...'
docker-compose up
