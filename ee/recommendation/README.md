# Recommendations

## index
1. [Build image](#build-image)
   1. [Recommendations service image](#recommendations-service-image)
   2. [Trainer service image](#trainer-service-image)
2. [Trainer](#trainer-service)
   1. Workflow
3. [Recommendations](#recommendation-service)

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
## Recommendation service
The recommendation service is a [FastAPI](https://fastapi.tiangolo.com) server that uses MLflow to read models from S3
and serve them, it also takes feedback from user and saves it into postgres for retraining purposes.
