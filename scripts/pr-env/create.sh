#!/bin/bash

set -e

if [ $# -lt 1 ]; then
  echo "bash $0 pr-number.openreplay.tools"
  echo "eg: bash $0 pr-111.openreplay.tools"
  exit 100
fi

export HOST=$1
PR_NO=`echo $HOST | cut -d '.' -f1`
CLUSTER_NAME="${PR_NO}-vcluster"
DOMAIN=${CLUSTER_NAME}.$(echo $HOST | cut -d"." -f2-)
echo "PR#: " $PR_NO "cluster endpoint domain: " $DOMAIN "CLUSTER_NAME: " $CLUSTER_NAME
cat <<EOF > values.yaml
sync:
  ingresses:
    enabled: true
  nodes:
    enabled: true
    syncAllNodes: true
syncer:
  extraArgs:
  - --tls-san=${DOMAIN}
EOF

vcluster create $CLUSTER_NAME -n $CLUSTER_NAME --connect=false -f values.yaml

kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    # We need the ingress to pass through ssl traffic to the vCluster
    # This only works for the nginx-ingress (enable via --enable-ssl-passthrough
    # https://kubernetes.github.io/ingress-nginx/user-guide/tls/#ssl-passthrough )
    # for other ingress controllers please check their respective documentation.
    nginx.ingress.kubernetes.io/backend-protocol: HTTPS
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  name: $CLUSTER_NAME
  namespace: $CLUSTER_NAME
spec:
  ingressClassName: openreplay # use your ingress class name
  rules:
  - host: $DOMAIN
    http:
      paths:
      - backend:
          service:
            name: $CLUSTER_NAME
            port:
              number: 443
        path: /
        pathType: ImplementationSpecific
EOF

echo "Getting kubeconfig file for vcluster"
vcluster connect $CLUSTER_NAME --update-current=false --server=https://$DOMAIN


