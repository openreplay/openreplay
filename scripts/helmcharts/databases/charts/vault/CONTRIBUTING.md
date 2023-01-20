# Contributing to Vault Helm

**Please note:** We take Vault's security and our users' trust very seriously.
If you believe you have found a security issue in Vault, please responsibly
disclose by contacting us at security@hashicorp.com.

**First:** if you're unsure or afraid of _anything_, just ask or submit the
issue or pull request anyways. You won't be yelled at for giving it your best
effort. The worst that can happen is that you'll be politely asked to change
something. We appreciate any sort of contributions, and don't want a wall of
rules to get in the way of that.

That said, if you want to ensure that a pull request is likely to be merged,
talk to us! You can find out our thoughts and ensure that your contribution
won't clash or be obviated by Vault's normal direction. A great way to do this
is via the [Vault Discussion Forum][1].

This document will cover what we're looking for in terms of reporting issues.
By addressing all the points we're looking for, it raises the chances we can
quickly merge or address your contributions.

[1]: https://discuss.hashicorp.com/c/vault

## Issues

### Reporting an Issue

* Make sure you test against the latest released version. It is possible
  we already fixed the bug you're experiencing. Even better is if you can test
  against `main`, as bugs are fixed regularly but new versions are only
  released every few months.

* Provide steps to reproduce the issue, and if possible include the expected
  results as well as the actual results. Please provide text, not screen shots!

* Respond as promptly as possible to any questions made by the Vault
  team to your issue. Stale issues will be closed periodically.

### Issue Lifecycle

1. The issue is reported.

2. The issue is verified and categorized by a Vault Helm collaborator.
   Categorization is done via tags. For example, bugs are marked as "bugs".

3. Unless it is critical, the issue may be left for a period of time (sometimes
   many weeks), giving outside contributors -- maybe you!? -- a chance to
   address the issue.

4. The issue is addressed in a pull request or commit. The issue will be
   referenced in the commit message so that the code that fixes it is clearly
   linked.

5. The issue is closed. Sometimes, valid issues will be closed to keep
   the issue tracker clean. The issue is still indexed and available for
   future viewers, or can be re-opened if necessary.

## Testing

The Helm chart ships with both unit and acceptance tests.

The unit tests don't require any active Kubernetes cluster and complete
very quickly. These should be used for fast feedback during development.
The acceptance tests require a Kubernetes cluster with a configured `kubectl`.

### Test Using Docker Container

The following are the instructions for running bats tests using a Docker container.

#### Prerequisites

* Docker installed
* `vault-helm` checked out locally

#### Test

**Note:** the following commands should be run from the `vault-helm` directory.

First, build the Docker image for running the tests:

```shell
docker build -f ${PWD}/test/docker/Test.dockerfile ${PWD}/test/docker/ -t vault-helm-test
```
Next, execute the tests with the following commands:
```shell
docker run -it --rm -v "${PWD}:/test" vault-helm-test bats /test/test/unit
```
It's possible to only run specific bats tests using regular expressions. 
For example, the following will run only tests with "injector" in the name:
```shell
docker run -it --rm -v "${PWD}:/test" vault-helm-test bats /test/test/unit -f "injector"
```

### Test Manually
The following are the instructions for running bats tests on your workstation.
#### Prerequisites
* [Bats](https://github.com/bats-core/bats-core)
  ```bash
  brew install bats-core
  ```
* [yq](https://pypi.org/project/yq/)
  ```bash
  brew install python-yq
  ```
* [helm](https://helm.sh)
  ```bash
  brew install kubernetes-helm
  ```

#### Test

To run the unit tests:

    bats ./test/unit

To run the acceptance tests:

    bats ./test/acceptance

If the acceptance tests fail, deployed resources in the Kubernetes cluster
may not be properly cleaned up. We recommend recycling the Kubernetes cluster to
start from a clean slate.

**Note:** There is a Terraform configuration in the
[`test/terraform/`](https://github.com/hashicorp/vault-helm/tree/main/test/terraform) directory
that can be used to quickly bring up a GKE cluster and configure
`kubectl` and `helm` locally. This can be used to quickly spin up a test
cluster for acceptance tests. Unit tests _do not_ require a running Kubernetes
cluster.

### Writing Unit Tests

Changes to the Helm chart should be accompanied by appropriate unit tests.

#### Formatting

- Put tests in the test file in the same order as the variables appear in the `values.yaml`.
- Start tests for a chart value with a header that says what is being tested, like this:
    ```
    #--------------------------------------------------------------------
    # annotations
    ```

- Name the test based on what it's testing in the following format (this will be its first line):
    ```
    @test "<section being tested>: <short description of the test case>" {
    ```

    When adding tests to an existing file, the first section will be the same as the other tests in the file.

#### Test Details

[Bats](https://github.com/bats-core/bats-core) provides a way to run commands in a shell and inspect the output in an automated way.
In all of the tests in this repo, the base command being run is [helm template](https://docs.helm.sh/helm/#helm-template) which turns the templated files into straight yaml output.
In this way, we're able to test that the various conditionals in the templates render as we would expect.

Each test defines the files that should be rendered using the `--show-only` flag, then it might adjust chart values by adding `--set` flags as well.
The output from this `helm template` command is then piped to [yq](https://pypi.org/project/yq/).
`yq` allows us to pull out just the information we're interested in, either by referencing its position in the yaml file directly or giving information about it (like its length).
The `-r` flag can be used with `yq` to return a raw string instead of a quoted one which is especially useful when looking for an exact match.

The test passes or fails based on the conditional at the end that is in square brackets, which is a comparison of our expected value and the output of  `helm template` piped to `yq`.

The `| tee /dev/stderr ` pieces direct any terminal output of the `helm template` and `yq` commands to stderr so that it doesn't interfere with `bats`.

#### Test Examples

Here are some examples of common test patterns:

- Check that a value is disabled by default

    ```
    @test "ui/Service: no type by default" {
      cd `chart_dir`
      local actual=$(helm template \
          --show-only templates/ui-service.yaml  \
          . | tee /dev/stderr |
          yq -r '.spec.type' | tee /dev/stderr)
      [ "${actual}" = "null" ]
    }
    ```

    In this example, nothing is changed from the default templates (no `--set` flags), then we use `yq` to retrieve the value we're checking, `.spec.type`.
    This output is then compared against our expected value (`null` in this case) in the assertion `[ "${actual}" = "null" ]`.


- Check that a template value is rendered to a specific value
    ```
    @test "ui/Service: specified type" {
      cd `chart_dir`
      local actual=$(helm template \
          --show-only templates/ui-service.yaml  \
          --set 'ui.serviceType=LoadBalancer' \
          . | tee /dev/stderr |
          yq -r '.spec.type' | tee /dev/stderr)
      [ "${actual}" = "LoadBalancer" ]
    }
    ```

    This is very similar to the last example, except we've changed a default value with the `--set` flag and correspondingly changed the expected value.

- Check that a template value contains several values
    ```
	@test "server/standalone-StatefulSet: custom resources" {
	  cd `chart_dir`
	  local actual=$(helm template \
		  --show-only templates/server-statefulset.yaml  \
		  --set 'server.standalone.enabled=true' \
		  --set 'server.resources.requests.memory=256Mi' \
		  --set 'server.resources.requests.cpu=250m' \
		  . | tee /dev/stderr |
		  yq -r '.spec.template.spec.containers[0].resources.requests.memory' | tee /dev/stderr)
	  [ "${actual}" = "256Mi" ]

	  local actual=$(helm template \
		  --show-only templates/server-statefulset.yaml  \
		  --set 'server.standalone.enabled=true' \
		  --set 'server.resources.limits.memory=256Mi' \
		  --set 'server.resources.limits.cpu=250m' \
		  . | tee /dev/stderr |
		  yq -r '.spec.template.spec.containers[0].resources.limits.memory' | tee /dev/stderr)
	  [ "${actual}" = "256Mi" ]
    ```

    *Note:* If testing more than two conditions, it would be good to separate the `helm template` part of the command from the `yq` sections to reduce redundant work.

- Check that an entire template file is not rendered
    ```
    @test "syncCatalog/Deployment: disabled by default" {
      cd `chart_dir`
      local actual=$( (helm template \
          --show-only templates/server-statefulset.yaml  \
          --set 'global.enabled=false' \
          . || echo "---") | tee /dev/stderr |
          yq 'length > 0' | tee /dev/stderr)
      [ "${actual}" = "false" ]
    }
    ```
    Here we are check the length of the command output to see if the anything is rendered.
    This style can easily be switched to check that a file is rendered instead.

## Contributor License Agreement

We require that all contributors sign our Contributor License Agreement ("CLA")
before we can accept the contribution.

[Learn more about why HashiCorp requires a CLA and what the CLA includes](https://www.hashicorp.com/cla)
