# Applications deployment

## with kubectl

You cannot just run `npx kontinuous build -o | kubectl apply -f -` from your project repository because predeployments must be run first. Predeployments are especially used to create the target namespace and copy the necessary secrets.

Run the following commands:

```sh
# build manifests
kontinuous build -o > manifests.yaml

# run predeployments
kontinuous deploy -f manifests.yaml \
  --disable-step=validators \
  --disable-step=deploy \
  --disable-step=post-deploy

# finally apply manifests
kubectl apply -f manifests.yaml
```

Note: you need to enable init containers because in this mode kontinuous won't be there to handle the dependency tree.
In your `.kontinuous/config.yaml` file, you must add:

```yaml
dependencies:
  contrib:
    patches:
      needsUsingInitcontainers:
        enabled: true
```

Be aware that using init containers might cause more network traffic that with default kontinuous mode, and that your init containers should never fail (otherwise they will be restarted indefinitely).

## with kontinuous CLI

Run `npx kontinuous deploy` from your project repository

## with GitHub actions

Use the [ks-gh boilerplate](https://github.com/SocialGouv/workflows/tree/master/boilerplates/ks-gh) to deploy your environments using GitHub actions.

You need to define two secrets in your GitHub repository config :

- `KUBECONFIG` as default cluster
- `KUBECONFIG` for a `production` environnement.

## with Custom webhook

Use the [ks-wh boilerplate](https://github.com/SocialGouv/workflows/tree/master/boilerplates/ks-wh) to deploy using a custom GIT webhook so you don't have to share your `KUBECONFIG`.

See [Webhook section](./advanced/webhook.md) for the detailed webhook setup.

### with GitLab

[TODO]
