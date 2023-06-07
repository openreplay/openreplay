# Recommendations

## index
1. [Build image](#build-image)
   1. [Recommendations service image](#recommendations-service-image)
   2. [Trainer service image](#trainer-service-image)
2. [Trainer](#trainer-service)
   1. [Env params](#trainer-env-params)
3. [Recommendations](#recommendation-service)
   1. [Env params](#recommendation-env-params)

## Build image
In order to build both recommendation image and trainer image, first a base image should be created by running the following command:
```bash
docker build -t recommendations_base .
```
which will add the files from `core` and `utils` which are common between `ml_service` and `ml_trainer` and will install common dependencies.

### Recommendations service image
Inside `ml_service` run docker build to create the recommendation service image
```bash
cd ml_service/
docker build -t recommendations .
cd ../
```
### Trainer service image
Inside `ml_trainer` run docker build to create the recommendation service image
```bash
cd ml_trainer/
docker build -t trainer .
cd ../
```
## Trainer service
The trainer is an orchestration service which is in charge of training models and saving models into S3.
This is made using Directed Acyclic Graphs (DAGs) in [Airflow](https://airflow.apache.org) for orchestration
and [MLflow](https://mlflow.org) as a monitoring service for training model that creates a registry over S3.
### Trainer env params
```bash
 pg_host=
 pg_port=
 pg_user=
 pg_password=
 pg_dbname=
 pg_host_ml=
 pg_port_ml=
 pg_user_ml=
 pg_password_ml=
 pg_dbname_ml='mlruns'
 PG_POOL='true'
 MODELS_S3_BUCKET= #'s3://path/to/bucket'
 pg_user_airflow=
 pg_password_airflow=
 pg_dbname_airflow='airflow'
 pg_host_airflow=
 pg_port_airflow=
 AIRFLOW_HOME=/app/airflow
 airflow_secret_key=
 airflow_admin_password=
 crons_train='0 0 * * *'
```
## Recommendation service
The recommendation service is a [FastAPI](https://fastapi.tiangolo.com) server that uses MLflow to read models from S3
and serve them, it also takes feedback from user and saves it into postgres for retraining purposes.
### Recommendation env params
```bash
 pg_host=
 pg_port=
 pg_user=
 pg_password=
 pg_dbname=
 pg_host_ml=
 pg_port_ml=
 pg_user_ml=
 pg_password_ml=
 pg_dbname_ml='mlruns'
 PG_POOL='true'
 API_AUTH_KEY=
```