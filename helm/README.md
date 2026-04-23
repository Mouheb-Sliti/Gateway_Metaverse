<!--
SPDX-FileCopyrightText: 2025 Orange SA
SPDX-License-Identifier: MIT

This software is distributed under the MIT License,
the text of which is available at https://opensource.org/license/mit
or see the "LICENSE.txt" file for more details.

Authors: See CONTRIBUTORS.txt
-->

# admin-ui

A Helm chart for disco admin ui portal.

## Source Code

* <https://gitlab.ow2.org/discobole/disco-oda-components/disco-ui-portals/admin-ui>

## Usage

Declare the helm repository:

```bash
helm repo add discobole-stable-repo https://gitlab.ow2.org/api/v4/groups/5972/packages/helm/stable
helm repo update
```

Deploy a release on cluster:

```bash
helm install my-release discobole-stable-repo/admin-ui
```

## Prerequisites Details

You will need access to a Kubernetes cluster, local or distant (OpenShift, Rancher, GKE, Vanilla Kubernetes, Minikube, MicroK8s, ...) with

- Kubernetes 1.20+

You will need the following installed and configured on your local environment:

- kubectl
- helm 3

Configure your local environment to have `kubectl` access to the target cluster.
For instance, if you wish to deploy to a project named `myproject` on `OpenShift`:

```bash
# first login to OpenShift cluster using your personal OpenShift token
$ oc login
# select the target project
$ oc project myproject
```

## Installing the Chart

To install the chart with the release name `my-release`:

```bash
$ helm install my-release discobole-stable-repo/admin-ui
```

The command deploys the application on the Kubernetes cluster in the **default** configuration. The [Parameters](#parameters) section lists the parameters that can be configured during installation.

> **Tip**: List all releases using `helm list`

## Uninstalling the Chart

To uninstall/delete the `my-release` deployment:

```console
$ helm uninstall my-release
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

The following table lists the configurable values of the chart.

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| gateway.service.gateway | string | `""` |  |
| gateway.service.orchestrationDelivery | string | `""` |  |
| affinity | object | `{}` |  |
| certManager.create | bool | `false` |  |
| fullnameOverride | string | `""` |  |
| image.pullPolicy | string | `"Always"` |  |
| image.repository | string | `"${docker_repository}"` |  |
| image.tag | string | `"${docker_tag}"` |  |
| ingress.enabled | bool | `false` |  |
| monitoring.app | string | `""` |  |
| monitoring.application | string | `""` |  |
| monitoring.domain | string | `"appli"` |  |
| monitoring.environment | string | `""` |  |
| monitoring.productName | string | `""` |  |
| monitoring.role | string | `"none"` |  |
| monitoring.topology | string | `"none"` |  |
| nameOverride | string | `""` |  |
| nodeSelector | object | `{}` |  |
| podAnnotations | object | `{}` |  |
| podSecurityContext | object | `{}` |  |
| registryCredentials.create | bool | `false` |  |
| replicaCount | int | `1` |  |
| securityContext | object | `{}` |  |
| service.port | int | `80` |  |
| service.targetPort | int | `8080` |  |
| service.type | string | `"ClusterIP"` |  |
| serviceAccount.annotations | object | `{}` |  |
| serviceAccount.create | bool | `true` |  |
| serviceAccount.name | string | `""` |  |
| tolerations | list | `[]` |  |

Specify each value using the `--set key=value[,key=value]` argument to `helm install`

Alternatively, a YAML file that specifies the values for the parameters can be provided while installing the chart. For example,

```console
$ helm install my-release -f values.yaml discobole-stable-repo/admin-ui
```

## Docker image access

These values help you to configure access to the Docker image for this microservice.

- if you need to pull the Docker image from a private or protected registry, you have to create and specify an `imagePullSecret`
- if you wish to let the chart create the image pull secret for you, configure the `serviceAccount.imagePullSecret` section

In case you delegate the creation of an image pull secret, use your own credentials on the private or protected registry, as follows.

```bash
$ helm install my-release discobole-stable-repo/admin-ui \
--set serviceAccount.imagePullSecret.create=true \
--set serviceAccount.imagePullSecret.registry=<your private or protected docker registry> \
--set serviceAccount.imagePullSecret.username=<you username> \
--set serviceAccount.imagePullSecret.password=<your access token>
```
