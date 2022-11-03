## Unreleased

## 0.22.1 (October 26th, 2022)

Changes:
* `vault` updated to 1.12.0 [GH-803](https://github.com/hashicorp/vault-helm/pull/803)
* `vault-k8s` updated to 1.0.1 [GH-803](https://github.com/hashicorp/vault-helm/pull/803)

## 0.22.0 (September 8th, 2022)

Features:
* Add PrometheusOperator support for collecting Vault server metrics. [GH-772](https://github.com/hashicorp/vault-helm/pull/772)

Changes:
* `vault-k8s` to 1.0.0 [GH-784](https://github.com/hashicorp/vault-helm/pull/784)
* Test against Kubernetes 1.25 [GH-784](https://github.com/hashicorp/vault-helm/pull/784)
* `vault` updated to 1.11.3 [GH-785](https://github.com/hashicorp/vault-helm/pull/785)

## 0.21.0 (August 10th, 2022)

CHANGES:
* `vault-k8s` updated to 0.17.0. [GH-771](https://github.com/hashicorp/vault-helm/pull/771)
* `vault-csi-provider` updated to 1.2.0 [GH-771](https://github.com/hashicorp/vault-helm/pull/771)
* `vault` updated to 1.11.2 [GH-771](https://github.com/hashicorp/vault-helm/pull/771)
* Start testing against Kubernetes 1.24. [GH-744](https://github.com/hashicorp/vault-helm/pull/744)
* Deprecated `injector.externalVaultAddr`. Added `global.externalVaultAddr`, which applies to both the Injector and the CSI Provider. [GH-745](https://github.com/hashicorp/vault-helm/pull/745)
* CSI Provider pods now set the `VAULT_ADDR` environment variable to either the internal Vault service or the configured external address. [GH-745](https://github.com/hashicorp/vault-helm/pull/745)

Features:
* server: Add `server.statefulSet.securityContext` to override pod and container `securityContext`. [GH-767](https://github.com/hashicorp/vault-helm/pull/767)
* csi: Add `csi.daemonSet.securityContext` to override pod and container `securityContext`. [GH-767](https://github.com/hashicorp/vault-helm/pull/767)
* injector: Add `injector.securityContext` to override pod and container `securityContext`. [GH-750](https://github.com/hashicorp/vault-helm/pull/750) and [GH-767](https://github.com/hashicorp/vault-helm/pull/767)
* Add `server.service.activeNodePort` and `server.service.standbyNodePort` to specify the `nodePort` for active and standby services. [GH-610](https://github.com/hashicorp/vault-helm/pull/610)
* Support for setting annotations on the injector's serviceAccount [GH-753](https://github.com/hashicorp/vault-helm/pull/753)

## 0.20.1 (May 25th, 2022)
CHANGES:
* `vault-k8s` updated to 0.16.1 [GH-739](https://github.com/hashicorp/vault-helm/pull/739)

Improvements:
* Mutating webhook will no longer target the agent injector pod [GH-736](https://github.com/hashicorp/vault-helm/pull/736)

Bugs:
* `vault` service account is now created even if the server is set to disabled, as per before 0.20.0 [GH-737](https://github.com/hashicorp/vault-helm/pull/737)

## 0.20.0 (May 16th, 2022)

CHANGES:
* `global.enabled` now works as documented, that is, setting `global.enabled` to false will disable everything, with individual components able to be turned on individually [GH-703](https://github.com/hashicorp/vault-helm/pull/703)
* Default value of `-` used for injector and server to indicate that they follow `global.enabled`. [GH-703](https://github.com/hashicorp/vault-helm/pull/703)
* Vault default image to 1.10.3
* CSI provider default image to 1.1.0
* Vault K8s default image to 0.16.0
* Earliest Kubernetes version tested is now 1.16
* Helm 3.6+ now required

Features:
* Support topologySpreadConstraints in server and injector. [GH-652](https://github.com/hashicorp/vault-helm/pull/652)

Improvements:
* CSI: Set `extraLabels` for daemonset, pods, and service account [GH-690](https://github.com/hashicorp/vault-helm/pull/690)
* Add namespace to injector-leader-elector role, rolebinding and secret [GH-683](https://github.com/hashicorp/vault-helm/pull/683)
* Support policy/v1 PodDisruptionBudget in Kubernetes 1.21+ for server and injector [GH-710](https://github.com/hashicorp/vault-helm/pull/710)
* Make the Cluster Address (CLUSTER_ADDR) configurable [GH-629](https://github.com/hashicorp/vault-helm/pull/709)
* server: Make `publishNotReadyAddresses` configurable for services [GH-694](https://github.com/hashicorp/vault-helm/pull/694)
* server: Allow config to be defined as a YAML object in the values file [GH-684](https://github.com/hashicorp/vault-helm/pull/684)
* Maintain default MutatingWebhookConfiguration values from `v1beta1` [GH-692](https://github.com/hashicorp/vault-helm/pull/692)

## 0.19.0 (January 20th, 2022)

CHANGES:
* Vault image default 1.9.2
* Vault K8s image default 0.14.2

Features:
* Added configurable podDisruptionBudget for injector [GH-653](https://github.com/hashicorp/vault-helm/pull/653)
* Make terminationGracePeriodSeconds configurable for server [GH-659](https://github.com/hashicorp/vault-helm/pull/659)
* Added configurable update strategy for injector [GH-661](https://github.com/hashicorp/vault-helm/pull/661)
* csi: ability to set priorityClassName for CSI daemonset pods [GH-670](https://github.com/hashicorp/vault-helm/pull/670)

Improvements:
* Set the namespace on the OpenShift Route [GH-679](https://github.com/hashicorp/vault-helm/pull/679)
* Add volumes and env vars to helm hook test pod [GH-673](https://github.com/hashicorp/vault-helm/pull/673)
* Make TLS configurable for OpenShift routes [GH-686](https://github.com/hashicorp/vault-helm/pull/686)

## 0.18.0 (November 17th, 2021)

CHANGES:
* Removed support for deploying a leader-elector container with the [vault-k8s injector](https://github.com/hashicorp/vault-k8s) injector since vault-k8s now uses an internal mechanism to determine leadership [GH-649](https://github.com/hashicorp/vault-helm/pull/649)
* Vault image default 1.9.0
* Vault K8s image default 0.14.1

Improvements:
* Added templateConfig.staticSecretRenderInterval chart option for the injector [GH-621](https://github.com/hashicorp/vault-helm/pull/621)

## 0.17.1 (October 25th, 2021)

Improvements:
  * Add option for Ingress PathType [GH-634](https://github.com/hashicorp/vault-helm/pull/634)

## 0.17.0 (October 21st, 2021)

KNOWN ISSUES:
* The chart will fail to deploy on Kubernetes 1.19+ with `server.ingress.enabled=true` because no `pathType` is set

CHANGES:
* Vault image default 1.8.4
* Vault K8s image default 0.14.0

Improvements:
* Support Ingress stable networking API [GH-590](https://github.com/hashicorp/vault-helm/pull/590)
* Support setting the `externalTrafficPolicy` for `LoadBalancer` and `NodePort` service types [GH-626](https://github.com/hashicorp/vault-helm/pull/626)
* Support setting ingressClassName on server Ingress [GH-630](https://github.com/hashicorp/vault-helm/pull/630)

Bugs:
* Ensure `kubeletRootDir` volume path and mounts are the same when `csi.daemonSet.kubeletRootDir` is overridden [GH-628](https://github.com/hashicorp/vault-helm/pull/628)

## 0.16.1 (September 29th, 2021)

CHANGES:
* Vault image default 1.8.3
* Vault K8s image default 0.13.1

## 0.16.0 (September 16th, 2021)

CHANGES:
* Support for deploying a leader-elector container with the [vault-k8s injector](https://github.com/hashicorp/vault-k8s) injector will be removed in version 0.18.0 of this chart since vault-k8s now uses an internal mechanism to determine leadership. To enable the deployment of the leader-elector container for use with vault-k8s 0.12.0 and earlier, set `useContainer=true`.

Improvements:
 * Make CSI provider `hostPaths` configurable via `csi.daemonSet.providersDir` and `csi.daemonSet.kubeletRootDir` [GH-603](https://github.com/hashicorp/vault-helm/pull/603)
 * Support vault-k8s internal leader election [GH-568](https://github.com/hashicorp/vault-helm/pull/568) [GH-607](https://github.com/hashicorp/vault-helm/pull/607)

## 0.15.0 (August 23rd, 2021)

Improvements:
* Add imagePullSecrets on server test [GH-572](https://github.com/hashicorp/vault-helm/pull/572)
* Add injector.webhookAnnotations chart option [GH-584](https://github.com/hashicorp/vault-helm/pull/584)

## 0.14.0 (July 28th, 2021)

Features:
* Added templateConfig.exitOnRetryFailure chart option for the injector [GH-560](https://github.com/hashicorp/vault-helm/pull/560)

Improvements:
* Support configuring pod tolerations, pod affinity, and node selectors as YAML [GH-565](https://github.com/hashicorp/vault-helm/pull/565)
* Set the default vault image to come from the hashicorp organization [GH-567](https://github.com/hashicorp/vault-helm/pull/567)
* Add support for running the acceptance tests against a local `kind` cluster [GH-567](https://github.com/hashicorp/vault-helm/pull/567)
* Add `server.ingress.activeService` to configure if the ingress should use the active service [GH-570](https://github.com/hashicorp/vault-helm/pull/570)
* Add `server.route.activeService` to configure if the route should use the active service [GH-570](https://github.com/hashicorp/vault-helm/pull/570)
* Support configuring `global.imagePullSecrets` from a string array [GH-576](https://github.com/hashicorp/vault-helm/pull/576)


## 0.13.0 (June 17th, 2021)

Improvements:
* Added a helm test for vault server [GH-531](https://github.com/hashicorp/vault-helm/pull/531)
* Added server.enterpriseLicense option [GH-547](https://github.com/hashicorp/vault-helm/pull/547)
* Added OpenShift overrides [GH-549](https://github.com/hashicorp/vault-helm/pull/549)

Bugs:
* Fix ui.serviceNodePort schema [GH-537](https://github.com/hashicorp/vault-helm/pull/537)
* Fix server.ha.disruptionBudget.maxUnavailable schema [GH-535](https://github.com/hashicorp/vault-helm/pull/535)
* Added webhook-certs volume mount to sidecar injector [GH-545](https://github.com/hashicorp/vault-helm/pull/545)

## 0.12.0 (May 25th, 2021)

Features:
* Pass additional arguments to `vault-csi-provider` using `csi.extraArgs` [GH-526](https://github.com/hashicorp/vault-helm/pull/526)

Improvements:
* Set chart kubeVersion and added chart-verifier tests [GH-510](https://github.com/hashicorp/vault-helm/pull/510)
* Added values json schema [GH-513](https://github.com/hashicorp/vault-helm/pull/513)
* Ability to set tolerations for CSI daemonset pods [GH-521](https://github.com/hashicorp/vault-helm/pull/521)
* UI target port is now configurable [GH-437](https://github.com/hashicorp/vault-helm/pull/437)

Bugs:
* CSI: `global.imagePullSecrets` are now also used for CSI daemonset [GH-519](https://github.com/hashicorp/vault-helm/pull/519)

## 0.11.0 (April 14th, 2021)

Features:
* Added `server.enabled` to explicitly skip installing a Vault server [GH-486](https://github.com/hashicorp/vault-helm/pull/486)
* Injector now supports enabling host network [GH-471](https://github.com/hashicorp/vault-helm/pull/471)
* Injector port is now configurable [GH-489](https://github.com/hashicorp/vault-helm/pull/489)
* Injector Vault Agent resource defaults are now configurable [GH-493](https://github.com/hashicorp/vault-helm/pull/493)
* Extra paths can now be added to the Vault ingress service [GH-460](https://github.com/hashicorp/vault-helm/pull/460)
* Log level and format can now be set directly using `server.logFormat` and `server.logLevel` [GH-488](https://github.com/hashicorp/vault-helm/pull/488)

Improvements:
* Added `https` name to injector service port [GH-495](https://github.com/hashicorp/vault-helm/pull/495)

Bugs:
* CSI: Fix ClusterRole name and DaemonSet's service account to properly match deployment name [GH-486](https://github.com/hashicorp/vault-helm/pull/486)

## 0.10.0 (March 25th, 2021)

Features:
* Add support for [Vault CSI provider](https://github.com/hashicorp/vault-csi-provider) [GH-461](https://github.com/hashicorp/vault-helm/pull/461)

Improvements:
* `objectSelector` can now be set on the mutating admission webhook [GH-456](https://github.com/hashicorp/vault-helm/pull/456)

## 0.9.1 (February 2nd, 2021)

Bugs:
* Injector: fix labels for default anti-affinity rule [GH-441](https://github.com/hashicorp/vault-helm/pull/441), [GH-442](https://github.com/hashicorp/vault-helm/pull/442)
* Set VAULT_DEV_LISTEN_ADDRESS in dev mode [GH-446](https://github.com/hashicorp/vault-helm/pull/446)

## 0.9.0 (January 5th, 2021)

Features:
* Injector now supports configurable number of replicas [GH-436](https://github.com/hashicorp/vault-helm/pull/436)
* Injector now supports auto TLS for multiple replicas using leader elections [GH-436](https://github.com/hashicorp/vault-helm/pull/436)

Improvements:
* Dev mode now supports `server.extraArgs` [GH-421](https://github.com/hashicorp/vault-helm/pull/421)
* Dev mode root token is now configurable with `server.dev.devRootToken` [GH-415](https://github.com/hashicorp/vault-helm/pull/415)
* ClusterRoleBinding updated to `v1` [GH-395](https://github.com/hashicorp/vault-helm/pull/395)
* MutatingWebhook updated to `v1` [GH-408](https://github.com/hashicorp/vault-helm/pull/408)
* Injector service now supports `injector.service.annotations` [425](https://github.com/hashicorp/vault-helm/pull/425)
* Injector now supports `injector.extraLabels` [428](https://github.com/hashicorp/vault-helm/pull/428)
* Added `allowPrivilegeEscalation: false` to Vault and Injector containers [429](https://github.com/hashicorp/vault-helm/pull/429)
* Network Policy now supports `server.networkPolicy.egress` [389](https://github.com/hashicorp/vault-helm/pull/389)

## 0.8.0 (October 20th, 2020)

Improvements:
* Make server NetworkPolicy independent of OpenShift [GH-381](https://github.com/hashicorp/vault-helm/pull/381)
* Added configurables for all probe values [GH-387](https://github.com/hashicorp/vault-helm/pull/387)
* MountPath for audit and data storage is now configurable [GH-393](https://github.com/hashicorp/vault-helm/pull/393)
* Annotations can now be added to the Injector pods [GH-394](https://github.com/hashicorp/vault-helm/pull/394)
* The injector can now be configured with a failurePolicy [GH-400](https://github.com/hashicorp/vault-helm/pull/400)
* Added additional environment variables for rendering within Vault config [GH-398](https://github.com/hashicorp/vault-helm/pull/398)
* Service account for Vault K8s auth is automatically created when `injector.externalVaultAddr` is set [GH-392](https://github.com/hashicorp/vault-helm/pull/392)

Bugs:
* Fixed install output using Helm V2 command [GH-378](https://github.com/hashicorp/vault-helm/pull/378)

## 0.7.0 (August 24th, 2020)

Features:
* Added `volumes` and `volumeMounts` for mounting _any_ type of volume [GH-314](https://github.com/hashicorp/vault-helm/pull/314).
* Added configurable to enable prometheus telemetery exporter for Vault Agent Injector [GH-372](https://github.com/hashicorp/vault-helm/pull/372)

Improvements:
* Added `defaultMode` configurable to `extraVolumes`[GH-321](https://github.com/hashicorp/vault-helm/pull/321)
* Option to install and use PodSecurityPolicy's for vault server and injector [GH-177](https://github.com/hashicorp/vault-helm/pull/177)
* `VAULT_API_ADDR` is now configurable [GH-290](https://github.com/hashicorp/vault-helm/pull/290)
* Removed deprecated tolerate unready endpoint annotations [GH-363](https://github.com/hashicorp/vault-helm/pull/363)
* Add an option to set annotations on the StatefulSet [GH-199](https://github.com/hashicorp/vault-helm/pull/199)
* Make the vault server serviceAccount name a configuration option [GH-367](https://github.com/hashicorp/vault-helm/pull/367)
* Removed annotation striction from `dev` mode [GH-371](https://github.com/hashicorp/vault-helm/pull/371)
* Add an option to set annotations on PVCs [GH-364](https://github.com/hashicorp/vault-helm/pull/364)
* Added service configurables for UI [GH-285](https://github.com/hashicorp/vault-helm/pull/285)

Bugs:
* Fix python dependency in test image [GH-337](https://github.com/hashicorp/vault-helm/pull/337)
* Fix caBundle not being quoted causing validation issues with Helm 3 [GH-352](https://github.com/hashicorp/vault-helm/pull/352)
* Fix injector network policy being rendered when injector is not enabled [GH-358](https://github.com/hashicorp/vault-helm/pull/358)

## 0.6.0 (June 3rd, 2020)

Features:
* Added `extraInitContainers` to define init containers for the Vault cluster [GH-258](https://github.com/hashicorp/vault-helm/pull/258)
* Added `postStart` lifecycle hook allowing users to configure commands to run on the Vault pods after they're ready [GH-315](https://github.com/hashicorp/vault-helm/pull/315)
* Beta: Added OpenShift support [GH-319](https://github.com/hashicorp/vault-helm/pull/319)

Improvements:
* Server configs can now be defined in YAML.  Multi-line string configs are still compatible [GH-213](https://github.com/hashicorp/vault-helm/pull/213)
* Removed IPC_LOCK privileges since swap is disabled on containers [[GH-198](https://github.com/hashicorp/vault-helm/pull/198)]
* Use port names that map to vault.scheme [[GH-223](https://github.com/hashicorp/vault-helm/pull/223)]
* Allow both yaml and multi-line string annotations [[GH-272](https://github.com/hashicorp/vault-helm/pull/272)]
* Added configurable to set the Raft node name to hostname [[GH-269](https://github.com/hashicorp/vault-helm/pull/269)]
* Support setting priorityClassName on pods [[GH-282](https://github.com/hashicorp/vault-helm/pull/282)]
* Added support for ingress apiVersion `networking.k8s.io/v1beta1` [[GH-310](https://github.com/hashicorp/vault-helm/pull/310)]
* Added configurable to change service type for the HA active service [GH-317](https://github.com/hashicorp/vault-helm/pull/317)

Bugs:
* Fixed default ingress path [[GH-224](https://github.com/hashicorp/vault-helm/pull/224)]
* Fixed annotations for HA standby/active services [[GH-268](https://github.com/hashicorp/vault-helm/pull/268)]
* Updated some value defaults to match their use in templates [[GH-309](https://github.com/hashicorp/vault-helm/pull/309)]
* Use active service on ingress when ha [[GH-270](https://github.com/hashicorp/vault-helm/pull/270)]
* Fixed bug where pull secrets weren't being used for injector image [GH-298](https://github.com/hashicorp/vault-helm/pull/298)

## 0.5.0 (April 9th, 2020)

Features:

* Added Raft support for HA mode [[GH-228](https://github.com/hashicorp/vault-helm/pull/229)]
* Now supports Vault Enterprise [[GH-250](https://github.com/hashicorp/vault-helm/pull/250)]
* Added K8s Service Registration for HA modes [[GH-250](https://github.com/hashicorp/vault-helm/pull/250)]

* Option to set `AGENT_INJECT_VAULT_AUTH_PATH` for the injector [[GH-185](https://github.com/hashicorp/vault-helm/pull/185)]
* Added environment variables for logging and revocation on Vault Agent Injector [[GH-219](https://github.com/hashicorp/vault-helm/pull/219)]
* Option to set environment variables for the injector deployment [[GH-232](https://github.com/hashicorp/vault-helm/pull/232)]
* Added affinity, tolerations, and nodeSelector options for the injector deployment [[GH-234](https://github.com/hashicorp/vault-helm/pull/234)]
* Made all annotations multi-line strings [[GH-227](https://github.com/hashicorp/vault-helm/pull/227)]

## 0.4.0 (February 21st, 2020)

Improvements:

* Allow process namespace sharing between Vault and sidecar containers [[GH-174](https://github.com/hashicorp/vault-helm/pull/174)]
* Added configurable to change updateStrategy [[GH-172](https://github.com/hashicorp/vault-helm/pull/172)]
* Added sleep in the preStop lifecycle step [[GH-188](https://github.com/hashicorp/vault-helm/pull/188)]
* Updated chart and tests to Helm 3 [[GH-195](https://github.com/hashicorp/vault-helm/pull/195)]
* Adds Values.injector.externalVaultAddr to use the injector with an external vault [[GH-207](https://github.com/hashicorp/vault-helm/pull/207)]

Bugs:

* Fix bug where Vault lifecycle was appended after extra containers. [[GH-179](https://github.com/hashicorp/vault-helm/pull/179)]

## 0.3.3 (January 14th, 2020)

Security:

* Added `server.extraArgs` to allow loading of additional Vault configurations containing sensitive settings [GH-175](https://github.com/hashicorp/vault-helm/issues/175)

Bugs:

* Fixed injection bug where wrong environment variables were being used for manually mounted TLS files

## 0.3.2 (January 8th, 2020)

Bugs:

* Fixed injection bug where TLS Skip Verify was true by default [VK8S-35]

## 0.3.1 (January 2nd, 2020)

Bugs:

* Fixed injection bug causing kube-system pods to be rejected [VK8S-14]

## 0.3.0 (December 19th, 2019)

Features:

* Extra containers can now be added to the Vault pods
* Added configurability of pod probes
* Added Vault Agent Injector

Improvements:

* Moved `global.image` to `server.image`
* Changed UI service template to route pods that aren't ready via `publishNotReadyAddresses: true`
* Added better HTTP/HTTPS scheme support to http probes
* Added configurable node port for Vault service
* `server.authDelegator` is now enabled by default

Bugs:

* Fixed upgrade bug by removing chart label which contained the version
* Fixed typo on `serviceAccount` (was `serviceaccount`)
* Fixed readiness/liveliness HTTP probe default to accept standbys

## 0.2.1 (November 12th, 2019)

Bugs:

* Removed `readOnlyRootFilesystem` causing issues when validating deployments

## 0.2.0 (October 29th, 2019)

Features:

* Added load balancer support
* Added ingress support
* Added configurable for service types (ClusterIP, NodePort, LoadBalancer, etc)
* Removed root requirements, now runs as Vault user

Improvements:

* Added namespace value to all rendered objects
* Made ports configurable in services
* Added the ability to add custom annotations to services
* Added docker image for running bats test in CircleCI
* Removed restrictions around `dev` mode such as annotations
* `readOnlyRootFilesystem` is now configurable
* Image Pull Policy is now configurable

Bugs:

* Fixed selector bugs related to Helm label updates (services, affinities, and pod disruption)
* Fixed bug where audit storage was not being mounted in HA mode
* Fixed bug where Vault pod wasn't receiving SIGTERM signals


## 0.1.2 (August 22nd, 2019)

Features:

* Added `extraSecretEnvironmentVars` to allow users to mount secrets as
  environment variables
* Added `tlsDisable` configurable to change HTTP protocols from HTTP/HTTPS
  depending on the value
* Added `serviceNodePort` to configure a NodePort value when setting `serviceType`
  to "NodePort"

Improvements:

* Changed UI port to 8200 for better HTTP protocol support
* Added `path` to `extraVolumes` to define where the volume should be
  mounted.  Defaults to `/vault/userconfig`
* Upgraded Vault to 1.2.2

Bugs:

* Fixed bug where upgrade would fail because immutable labels were being
  changed (Helm Version label)
* Fixed bug where UI service used wrong selector after updating helm labels
* Added `VAULT_API_ADDR` env to Vault pod to fixed bug where Vault thinks
  Consul is the active node
* Removed `step-down` preStop since it requires authentication.  Shutdown signal
  sent by Kube acts similar to `step-down`


## 0.1.1 (August 7th, 2019)

Features:

* Added `authDelegator` Cluster Role Binding to Vault service account for
  bootstrapping Kube auth method

Improvements:

* Added `server.service.clusterIP` to `values.yml` so users can toggle
  the Vault service to headless by using the value `None`.
* Upgraded Vault to 1.2.1

## 0.1.0 (August 6th, 2019)

Initial release
