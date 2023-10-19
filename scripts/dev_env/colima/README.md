## Installing Colima

[Colima](https://github.com/abiosoft/colima) is a container runtime environment, which makes it possible to run x64 images in Mac M1 easily.

```bash
brew install --head colima
brew install docker kubectl helm k9s stern
```

<aside>
💡 Following command with change the docker context to Colima. You can change that using
`docker context ls`

</aside>

```yaml
colima start --with-kubernetes --cpu 2 --memory 8 -p openreplay
```

## Installing OpenReplay

```yaml
git clone https://github.com/openreplay/openreplay -b dev
cd openreplay/scripts/helmcharts
SKIP_K8S_INSTALL=1 SKIP_K8S_TOOLS=1 DOMAIN_NAME=openreplay.local bash -x init.sh
```

## Updating DNS


```bash
sudo vim /etc/hosts
127.0.0.1 openreplay.local
```

## Access Openreplay

Go to [http://openreplay.local](http://openreplay.local) in your browser and signup to create an account.

For recording a session, in the tracker, enable `__DISABLE_SECURE_MODE: false`, as openreplay running without SSL locally.

For more information, refer [here](https://docs.openreplay.com/installation/javascript-sdk#security).


## Troubleshoot

1. Colima error for copying context

    <aside>
    💡 If you’re getting error `error at 'updating config': error fetching kubeconfig on guest: exit status 1`

    </aside>

    **Solution**

    ```yaml
    colima ssh -p openreplay
    cat echo;/etc/rancher/k3s/k3s.yaml;echo
    # copy output and exit from the shell

    # In your local machine
    cd ~/.kube || ( mkdir ~/.kube && cd ~/.kube)
    # past from buffer and save file
    vim openreplay-local.yaml
    export KUBECONFIG=~/.kube/openreplay-local.yaml
    ```

2. if minio is crashlooping

    ```yaml
    # in vars.yaml
    minio:
      resources:
        limits:
          cpu: 512m
    ```

Having trouble setting up this plugin? Please connect to our [Slack](https://slack.openreplay.com/) and get help from our community.
