# Quickwit for kafka messages (S3 storage)

## index
1. [Setup](#setup)
2. [Deploy](#deploy)

## Setup
This setup is made using Docker, make changes to the files accordingly to run it locally.

In order to connect to AWS S3 service the aws credentials must be defined in the environment
```bash
export aws_access_key_id={your_aws_access_key_id}
export aws_secret_access_key={your_aws_secret_access_key}
export aws_region={bucket_region}
```
In the file kafka-source.yaml replace the bootstap.server with the address of your kafka service and uncomment to activate ssl protocol if needed.
## Deploy

To create the index 'quickwit-kafka' run the command:
```bash
bash create_kafka_index.sh
```
Having the topic 'quickwit-kafka' in the kafka server defined in the kafka-source.yaml, the connection between the created index and the topic can be achieved by running the command:
```bash
bash create_source.sh
```
To delete both the index and the source connection run the command:
```bash
bash clean.sh
```

To deploy the indexer, search and UI services run the command:
```bash
bash run_quickwit.sh
```
UI server will start at localhost:7280. The api can also be called through the url http://127.0.0.1:7280/api/v1/quickwit-kafka/search?query={your_query} for example
```bash
curl "http://127.0.0.1:7280/api/v1/quickwit-kafka/search?query=body:error"
```