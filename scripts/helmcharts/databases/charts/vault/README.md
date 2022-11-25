# Vault Helm Chart

> :warning: **Please note**: We take Vault's security and our users' trust very seriously. If 
you believe you have found a security issue in Vault Helm, _please responsibly disclose_ 
by contacting us at [security@hashicorp.com](mailto:security@hashicorp.com).

This repository contains the official HashiCorp Helm chart for installing
and configuring Vault on Kubernetes. This chart supports multiple use
cases of Vault on Kubernetes depending on the values provided.

For full documentation on this Helm chart along with all the ways you can
use Vault with Kubernetes, please see the
[Vault and Kubernetes documentation](https://www.vaultproject.io/docs/platform/k8s/).

## Prerequisites

To use the charts here, [Helm](https://helm.sh/) must be configured for your
Kubernetes cluster. Setting up Kubernetes and Helm is outside the scope of
this README. Please refer to the Kubernetes and Helm documentation.

The versions required are:

  * **Helm 3.6+**
  * **Kubernetes 1.16+** - This is the earliest version of Kubernetes tested.
    It is possible that this chart works with earlier versions but it is
    untested.

## Usage

To install the latest version of this chart, add the Hashicorp helm repository
and run `helm install`:

```console
$ helm repo add hashicorp https://helm.releases.hashicorp.com
"hashicorp" has been added to your repositories

$ helm install vault hashicorp/vault
```

Please see the many options supported in the `values.yaml` file. These are also
fully documented directly on the [Vault
website](https://www.vaultproject.io/docs/platform/k8s/helm) along with more
detailed installation instructions.
