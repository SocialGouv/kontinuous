# Applications deployment

## with kubectl

Run `npx kontinuous build -o | kubectl apply -f -` from your project repository

## with kontinuous CLI

Run `npx kontinuous deploy` from your project repository

## With GitHub actions

Use the [ks-gh boilerplate](https://github.com/SocialGouv/workflows/tree/master/boilerplates/ks-gh) to deploy your environments using GitHub actions.

You need to define two secrets in your GitHub repository config :

- `KUBECONFIG` as default cluster
- `KUBECONFIG` for a `production` environnement.

## With Custom webhook

Use the [ks-wh boilerplate](https://github.com/SocialGouv/workflows/tree/master/boilerplates/ks-wh) to deploy using a custom GIT webhook so you don't have to share your `KUBECONFIG`.

See [Webhook section](./advanced/webhook.md) for the detailed webhook setup.

### with GitLab

[TODO]
