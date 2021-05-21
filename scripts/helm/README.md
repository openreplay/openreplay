## Helm charts for installing openreplay components. 

Installation components are separated by namepaces.

**Namespace:**
  
- **app:** Core openreplay application related components.
  - alert
  - auth
  - cache
  - chalice
  - clickhouse
  - ender
  - events
  - failover
  - filesink
  - filestorage
  - http
  - integrations
  - ios-proxy
  - metadata
  - negative
  - pg-stateless
  - pg
  - preprocessing
  - redis
  - ws

- **db:** Contains following databases and backend components.
  - kafka
  - redis
  - postgresql
  - clickhouse
  - minio
  - sqs
  - nfs-server

- **longhorn:** On-Prem storage solution for kubernetes PVs.

- **nginx-ingress:** Nginx ingress for internet traffic to enter the kubernetes cluster.

**Scripts:**
- **install.sh**

  Installs openreplay in a single node machine, for trial runs / demo.

  This script is a wrapper around the `install.sh` with [k3s](https://k3s.io/) as kubernetes distro.
  
  Note: As of now this script support only ubuntu, as we've to install some packages to enable `NFS`.

- **kube-install.sh:**
  
  Installs openreplay on any given kubernetes cluster. Has 3 configuration types
  - small (4cores 8G RAM)
  - medium (4cores 16G RAM)
  - recommened (8cores 32G RAM)
  
  For all options, `bash kube-install.sh -h`
