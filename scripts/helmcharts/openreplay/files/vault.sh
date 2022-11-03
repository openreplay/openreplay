#!/bin/sh

# This script will initialize vault

export VAULT_ADDR=http://databases-vault.db.svc.cluster.local:8200


# Check vault is already initialized, if so return 

# initialize vault
vault_output=$(vault operator init) 2> /tmp/err.txt || {
  err_code=$?
  (cat /tmp/err.txt | grep -i "vault is already initialized") && {
    echo "Vault already initialized."
    err_code=0
  }
  echo exit $err_code
}

# Writting output to a file
echo $vault_output > /tmp/vault_creds.txt

# Unsealing vault
for i in 1 2 3; do
  vault operator unseal `echo $vault_output | grep -Eio "unseal key $i: \S+" | awk '{print $4}'`
done

# Logging in to vault
vault login  `echo $vault_output | grep -Eio "initial root token: \S+" | awk '{print $4}'`

# Confguration

vault secrets enable database

vault write database/roles/db-app \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  revocation_statements="ALTER ROLE \"{{name}}\" NOLOGIN;"\
  default_ttl="1m" \
  max_ttl="5m"

vault write database/config/postgres \
    plugin_name=postgresql-database-plugin \
    allowed_roles="*" \
    connection_url="postgresql://{{username}}:{{password}}@$PGHOST:$PGPORT/$PGDATABASE" \
    username="${PGUSER}" \
    password="${PGPASSWORD}"

vault auth enable kubernetes

vault write auth/kubernetes/config \
       token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
       kubernetes_host=https://${KUBERNETES_PORT_443_TCP_ADDR}:443 \
       kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt


# Allow apps to create credentials for the policy db-app
cat <<EOF >/tmp/pgaccess-policy.hcl
path "database/creds/db-app" {
  capabilities = ["read"]
}
EOF

vault policy write pgaccess /tmp/pgaccess-policy.hcl

vault write auth/kubernetes/role/pgaccess \
    bound_service_account_names="*-openreplay" \
    bound_service_account_namespaces=app \
    policies=pgaccess \
    ttl=1h
