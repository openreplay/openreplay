mkdir tmp
cp ../api/chalicelib/utils/ch_client.py tmp
cp ../../api/chalicelib/utils/pg_client.py tmp
docker build -t my_test .
rm tmp/*.py
rmdir tmp
