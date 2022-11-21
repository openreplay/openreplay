mkdir tmp
cp ../api/chalicelib/utils/ch_client.py tmp
cp ../api/chalicelib/utils/events_queue.py tmp
cp ../../api/chalicelib/utils/pg_client.py tmp
docker build -t my_test .
rm tmp/*.py
rmdir tmp
docker run -d -p 8080:8080 my_test
