Source variable file

```bash
set -a
source common.env
set +a
```

Set the following env variables in a file named .env (Or load them via infisical into a .env file)

-   COMMON_DOMAIN_NAME
-   COMMON_JWT_SECRET
-   COMMON_JWT_REFRESH_SECRET
-   COMMON_S3_KEY
-   COMMON_S3_SECRET
-   COMMON_PG_PASSWORD

To run this with infisical e.g.

```bash
infisical export --token=$(infisical login --method=universal-auth --client-id=<identity-client-id> --client-secret=<identity-client-secret> --silent --plain) --format=dotenv-export > .env
```
