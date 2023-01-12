# kontinuous Webhook

Using the webhook service you can be totally independent and self-hosted for running you CI/CD workflow.

The service can be deployed using an [official Helm chart](https://github.com/socialgouv/kontinuous/blob/master/packages/webhook/Chart.yaml).

[![schema](../images/webhook-schema.png)](https://excalidraw.com/#json=OoAm9RLHobXlWw9DmzC6x,R0CXD2-2gYj8D-9OvJS3GA)

## deploy webhook

### using Helm

It require you have predefined these secrets (in the namespace `myproject-ci` in example): <br>

- kubeconfig-dev
- kubeconfig-prod
- kubewebhook

_You can replace secrets names using values key `secretRefNames`._

Secrets should contains following environment variables:

- `KUBEWEBHOOK_TOKEN`
- `KUBECONFIG` and/or `KUBECONFIG_DEV`+`KUBECONFIG_PROD`,

To see all avaiables values and defaults see [packages/webhook/values.yaml](https://github.com/socialgouv/kontinuous/blob/master/packages/webhook/values.yaml).

```sh
npx -y tiged socialgouv/kontinuous/packages/webhook@master kontinuous-webhook

cd ./kontinuous-webhook

helm template . \
    --set ciNamespace=myproject-ci \
    --set host=webhook-myproject.example.com \
    > manifests.yaml

kubectl --namespace myproject-ci apply manifests.yaml
```

### using ArgoCD

Here is a sample of an [ArgoCD ApplicationSet](https://argo-cd.readthedocs.io/en/stable/roadmap/#applicationset): [plugins/fabrique/samples/argocd/kontinuous-webhooks.yaml](https://github.com/SocialGouv/kontinuous/tree/master/boilerplates/infra-samples/argocd)

## configure webhook on repository

Get the deploy `KUBEWEBHOOK_TOKEN` and add it to your repository secrets.

You should configure webhook event on push event on repository (from github, gitlab (should be tested), gitea (should be dev))

### Github repository settings

In the github repository, go to **settings** -> **Webhooks** -> **Add webhook**

in _Payload URL_ field put the endpoint: https://webhook-myproject.example.com/api/v1/oas/hooks/github?event=pushed

In _Which events would you like to trigger this webhook?_
select "Just the push event".

Check the _Active_ checkbox.

Then click to _Add webhook_ and you're good for **dev** env.

For **prod**, do the same but replace endpoint by: https://webhook-myproject.example.com/api/v1/oas/hooks/github?event=created <br>
and after selecting _Let me select individual events_, ensure you have all unchecked (uncheck _push_ event that is generally checked by default) and check _Branch or tag creation_

If you have to configure for many repo and you want to make it automatically and _infra as code_, here is a terraform snippet sample: [plugins/fabrique/samples/terraform/rancher-config-setup/github.tf](https://github.com/SocialGouv/kontinuous/blob/master/boilerplates/infra-samples/terraform/rancher-config-setup/github.tf)

### Workflows

You can use the [ks-wh boilerplate](https://github.com/SocialGouv/workflows/tree/master/boilerplates/ks-wh) to start using your webhook.
