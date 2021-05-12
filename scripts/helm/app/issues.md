i [X] alert:
  - [X] postgresql app db not found
      public.alerts relation doesn't exist
- [X] cache:
  - [X] connecting kafka with ssl://
- [X] events:
  - [X] postgresql app db not found
    ```
    ERROR: relation "integrations" does not exist (SQLSTATE 42P01) 
    ```
- [X] failover: asayer no error logs
  - [X] Redis error: NOAUTH Authentication required. 
        redis cluster should not have password
  - [X] Redis has cluster support disabled 
- [X] redis-asayer:
  - [X] /root/workers/redis/main.go:29: Redis error: no pools available
  - [X] /root/workers/pg/main.go:49: Redis error: no cluster slots assigned
- [X] ws-asayer:
  - [X] Redis has cluster support disabled 
- [X] ender:
  - [X] /root/pkg/kafka/consumer.go:95: Consumer error: Subscribed topic not available: ^(raw)$: Broker: Unknown topic or partition 
  - [X] kafka ssl
- [X] preprocessor:
  - [X] kafka ssl
- [X] clickhouse-asayer:
  - [X] Table default.sessions doesn't exist.
- [ ] puppeteer:
  - [ ] Image not found 
    ```
    repository 998611063711.dkr.ecr.eu-central-1.amazonaws.com/puppeteer-jasmine not found: name unknown: The repository with name 'puppeteer-jasmine' does not exist in the registry with id '998611063711
    Back-off pulling image "998611063711.dkr.ecr.eu-central-1.amazonaws.com/puppeteer-jasmine:latest"
    ```
- [o] negative:
  - [X] Clickhouse prepare error: code: 60, message: Table default.negatives_buffer doesn't exist.
  - [ ] kafka ssl issue
- [o] metadata:
  - [X] code: 60, message: Table default.sessions_metadata doesn't exist.
  - [ ] /root/workers/metadata/main.go:96: Consumer Commit error: Local: No offset stored
- [ ] http:
  - [ ] /root/pkg/env/worker_id.go:8: Get : unsupported protocol scheme "" 
- [o] chalice:
 - [X] No code to start
   - [X] first install deps
   - [X] then install chalice
 - [X] sqs without creds
 - [ ] do we need dead-runs as aws put failed in deadruns Q
 - [ ] do we have to limit for parallel runs / the retries ?

## Talk with Mehdi and Sacha
- [X] Do we need new app or old
- [X] in new we don't need redis. so what should we do ?

# 3 new workers

This is not in prod
kafka-staging take the new by compare with prod

1. ender sasha
2. pg_stateless sasha
3. http sasha
4. changed preprocessing: david
5. ios proxy: taha

Application loadbalancer

domain: ingest.asayer.io

ingress with ssl termination.
  ios proxy ( in ecs )
  oauth
  ws
  api
  http ( sasha )

ws lb with ssl:
  ingress
