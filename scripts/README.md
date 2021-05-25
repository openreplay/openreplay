###  Installing OpenReplay on any VM (Debian based, preferably Ubuntu 20.04)

You can start testing OpenReplay by installing it on any VM (at least `2 vCPUs, 8 GB of RAM and 50 GB of storage`). We'll initialize a single node kubernetes cluster with [k3s](https://k3s.io) and install OpenReplay on the cluster.

```bash
cd helm && bash install.sh
```

###  Installing OpenReplay on Kubernetes

OpenReplay runs 100% on kubernetes. So if you've got a kubernetes cluster, preferably, a cluster dedicated to OpenReplay (on a single node of `4 vCPUs, 8 GB of RAM and 50 GB of storage`). You can run the script, which internally uses helm to install OpenReplay.

We hope your cluster has provision to create a [service type](https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer) `LoadBalancer` for exposing OpenReplay on the internet.

```bash
cd helm && bash kube-install.sh
```

### Management of OpenReplay apps

- **openreplay-cli:**

  This script will help to manage OpenReplay applications. Basic operations covered are:
  - status: status of the applications
  - logs: logs of a specific application
  - stop: stop one or all services
  - start: start one or all services
  - restart: restart one or all services

  For more information:

  ```bash
  cd helm && openreplay-cli -h
  ```
