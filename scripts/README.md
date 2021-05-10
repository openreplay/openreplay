###  Installing Asayer on any VM(Debian based, preferably Ubuntu 20.04)

You can start testing Asayer by installing it on any VM ( ideally, 4core 16G ) machine.
We'll initialize a single node kubernetes cluster with [k3s](https://k3s.io) and install Asayer on the cluster.

```bash
cd helm && bash minimal-install.sh
```

###  Installing Asayer on kubernetes cluster

Asayer runs 100% on kubernetes. So if you've got a kubernetes cluster, preferably, a cluster dedicated to asayer(even a single node 4core 16G node),
You can run the script, which internally uses helm to install Asayer.

We hope your cluster has provision to create a [service type](https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer) `LoadBalancer` for exposing Asayer on internet.

```bash
cd helm && bash install.sh
```

### Management of Asayer apps

- **asayer-cli:**

  This script will help to manage asayer applications. Basic opeations covered are
  - status: status of the applications
  - logs: logs of a specific application.
  - stop: stop one or all services.
  - start: start one or all services.
  - restart: restart one or all services.
  
  For more information,
  ```bash
  cd helm && asayer-cli -h
  ```
