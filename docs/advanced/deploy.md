# Applications deployment

## with kontinuous CLI

Run `npx kontinuous deploy` from your project repository. Depending of your infra, you will need to pass options as `--ci-namespace <ns>` (needed at **_La Fabrique_** for example).

for help call:
`npx kontinuous deploy --help`

You can also generate the manifests and then deploy it using [carvel/kapp](https://carvel.dev/kapp/)

```sh
npx kontinuous build -o > /tmp/manifests.yaml

kapp deploy /tmp/manifests.yaml
  --app label:kontinuous/kapp=name-of-my-app \
  --logs-all \
  --dangerous-override-ownership-of-existing-resources \
  -f /tmp/manifests.yaml
```

## with GitHub Actions

- Option 1: **webhook + github logs** (the recommended one)

  CI/CD pipeline are triggered using the [webhook service](#_63-using-webhook-service) and the github CI is only responsible of deployment logging and manifests artifact retrieving and publishing. Retrying an action is trigerring a new pipeline using the webhook endpoint 😉. <br>
  To do this way you have to configure the [webhook service](#_63-using-webhook-service) first, then, if you want to use github (no obligation), you can implement it as [reusable workflow](.github/workflows/workflow-logs.yaml) or [composite action](logs/action.yaml):

  reusable workflow (the recommended one):

  ```yaml
  jobs:
    follow-deployment:
      uses: socialgouv/kontinuous/.github/workflows/workflow-webhook.yaml@v1
      secrets: inherit
  ```

  It require to configure the webhook on `push`+`create` and `delete` events at repository level on the git platform. On rerun, the action will trigger the webhook itself.

  reusable workflow without using webhook feature of git platform:

  ```yaml
  jobs:
    follow-deployment:
      uses: socialgouv/kontinuous/.github/workflows/workflow-webhook.yaml@v1
      secrets: inherit
      triggerWebhook: true
  ```

  With the option `triggerWebhook`, the action will trigger webhook pipeline on first run, if not provided, it will expect that webhook feature has allready triggered webhook pipeline and try to catch it on the fly.

  composite action:

  ```yaml
  jobs:
    logs:
      name: logs
      runs-on: ubuntu-latest
      steps:
      - name: kontinuous pipeline
          uses: socialgouv/kontinuous/webhook@v1
          with:
            token: ${{ secrets.GITHUB_TOKEN }}
            webhookToken: ${{ secrets.KUBEWEBHOOK_TOKEN }}
            webhookUri: https://webhook-${{ secrets.RANCHER_PROJECT_NAME }}.fabrique.social.gouv.fr
            # triggerWebhook: true # uncomment this line to use trigger only by action, without using webhook trigger feature on git platform at repository config level
  ```

- Option 2: **rely on Github CI**:

  You can deploy using github actions, running kontinuous deploy in the github CI

  ```yaml
  jobs:
    deploy:
      name: deploy
      runs-on: ubuntu-latest
      steps:
      - name: kontinuous pipeline
          uses: socialgouv/kontinuous/gh-actions/deploy-via-github@v1
          with:
            token: ${{ secrets.GITHUB_TOKEN }}
            kubeconfig: ${{ secrets.KUBECONFIG }}
            rancherProjectId: ${{ secrets.RANCHER_PROJECT_ID }}
            rancherProjectName: ${{ secrets.RANCHER_PROJECT_NAME }}
  ```

- Option 3: **manual workflow action deployed via webhook**:

  If you want to deploy custom action manifests via webhook you can use flag `--on-webhook`/`-w` like

  ```sh
  npx kontinuous deploy --chart my-custom-action --on-webhook
  ```

  values.yaml

  ```yaml
  my-custom-action:
    enabled: false # so it will not be enabled by default on classical deployment task, but only on demand in a trigger workflow using `--chart my-custom-action`
  ```

  And naturally, you can put helm templates here: `.kontinuous/my-custom-action/template`

### with GitLab

[TODO]

### With Webhook

If you dont want to distribute `KUBECONFIG`, you can use kontinuous webhook. See [./webhook](./advanced/webhook.md) for details.
