# Longhorn Chart

> **Important**: Please install the Longhorn chart in the `longhorn-system` namespace only.

> **Warning**: Longhorn doesn't support downgrading from a higher version to a lower version.

## Source Code

Longhorn is 100% open source software. Project source code is spread across a number of repos:

1. Longhorn Engine -- Core controller/replica logic https://github.com/longhorn/longhorn-engine
2. Longhorn Instance Manager -- Controller/replica instance lifecycle management https://github.com/longhorn/longhorn-instance-manager
3. Longhorn Manager -- Longhorn orchestration, includes CSI driver for Kubernetes https://github.com/longhorn/longhorn-manager
4. Longhorn UI -- Dashboard https://github.com/longhorn/longhorn-ui

## Prerequisites

1. Docker v1.13+
2. Kubernetes v1.15+
3. Make sure `curl`, `findmnt`, `grep`, `awk` and `blkid` has been installed in all nodes of the Kubernetes cluster.
4. Make sure `open-iscsi` has been installed in all nodes of the Kubernetes cluster. For GKE, recommended Ubuntu as guest OS image since it contains `open-iscsi` already.

## Installation
1. Add Longhorn chart repository.
```
helm repo add longhorn https://charts.longhorn.io
```

2. Update local Longhorn chart information from chart repository.
```
helm repo update
```

3. Install Longhorn chart.
- With Helm 2, the following command will create the `longhorn-system` namespace and install the Longhorn chart together.
```
helm install longhorn/longhorn --name longhorn --namespace longhorn-system
``` 
- With Helm 3, the following commands will create the `longhorn-system` namespace first, then install the Longhorn chart.

```
kubectl create namespace longhorn-system
helm install longhorn longhorn/longhorn --namespace longhorn-system
```

## Uninstallation

With Helm 2 to uninstall Longhorn.
```
helm delete longhorn --purge
```

With Helm 3 to uninstall Longhorn.
```
helm uninstall longhorn -n longhorn-system
kubectl delete namespace longhorn-system
```

---
Please see [link](https://github.com/longhorn/longhorn) for more information.
