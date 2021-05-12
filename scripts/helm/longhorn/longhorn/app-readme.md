# Longhorn

Longhorn is a lightweight, reliable and easy to use distributed block storage system for Kubernetes. Once deployed, users can leverage persistent volumes provided by Longhorn.

Longhorn creates a dedicated storage controller for each volume and synchronously replicates the volume across multiple replicas stored on multiple nodes. The storage controller and replicas are themselves orchestrated using Kubernetes. Longhorn supports snapshots, backups and even allows you to schedule recurring snapshots and backups!

**Important**: Please install Longhorn chart in `longhorn-system` namespace only.

**Warning**: Longhorn doesn't support downgrading from a higher version to a lower version.

[Chart Documentation](https://github.com/longhorn/longhorn/blob/master/chart/README.md)
