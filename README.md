# `socialgouv/kube-workflow` 🚀
Deploy application over kubernetes

## Call it in review, preprod, and prod github workflows

```yaml
- uses: SocialGouv/kube-workflow@master
  with:
    environment: "dev"
    token: ${{ secrets.GITHUB_TOKEN }}
    kubeconfig: ${{ secrets.KUBECONFIG }}
    rancherProjectId: ${{ secrets.RANCHER_PROJECT_ID }}
    rancherProjectName: ${{ secrets.RANCHER_PROJECT_NAME }}
    imagePackage: app
    # imageName: fabrique/www
```

## Configure your project's Helm Charts values
You can configure your project by adding `.kube-workflow/common/values.yaml` and `.kube-workflow/$ENVIRONMENT/values.yaml`.
```yaml
# here you define variables shared by all helm subcharts/components
global: {}

# here you can configure components values, key same name as in `components` sections
app:
  enabled: true
  containerPort: 80
```
Here is the order, the last in the list is the last applied:
- `$KUBEWORKFLOW_ACTION/chart/values.yaml` (the defaults)
- default values generated by the pipeline [$KUBEWORKFLOW_ACTION/action/values.js](action/values.js)
- `.kube-workflow/common/values.yaml` (the common project's config)
- `.kube-workflow/$ENVIRONMENT/values.yaml`

## Merge commons manifests as helm templates
Every yaml file in `.kube-workflow/templates` will be merged with the helm Chart `templates` folder before the build.

All theses files can use the Helm templating syntax (or not if you don't need it, helm template is a superset of yaml).

Both extensions yaml and yml are accepted.

## Merge manifests per environment as helm templates
Every yaml files in `.kube-workflow/env/$ENVIRONMENT/templates` will be merged with the helm Chart `templates` folder before the build, according to the `environment` input (dev | preprod | prod).

All theses files can use the Helm templating syntax.

Usually, that's where you put your ConfigMap and SealedSecrets ressources.

## Override and extends everything from your project
Everything is overridable using filesystem merging.

The `.kube-workflow` directoty of your project will be merged and eventually overwrite content of this repository `chart` directory.

### Override the full Chart
- You can optout from the generic Chart and define a new one by creating your own `Chart.yaml` in the directory `.kube-workflow`. More often, you can use kustomize to adjust the manifests.

### Override and extends kustomizations
The kustomization patches are applied after Helm template rendering.

The kustomization entrypoint is `$KUBEWORKFLOW_ACTION/env/$ENVIRONMENT/kustomization.yaml`.

To override it, create a file called `.kube-workflow/env/$ENVIRONMENT/kustomization.yaml` in your project and containing:
```yaml
resources:
- ../../common

patches:
# ... put your patches here
```
By doing this way you just optouted from generic kustomization for the selected environment.

If you want (and more often you want) to keep the generic kustomization, containing some infra logic defined by the advised SRE team, you can extends it like this.
```yaml
resources:
- ../../common.autodevops

patches:
# ... put your patches here
```

You can do it as well for the common base file called by environment kustomizations, just add a file called `.kube-workflow/common/kustomization.yaml` in your project and containing:
```yaml
resources:
# - ../base # here is if you want to optout
- ../common.autodevops # here is if you want to extends from autodevops default settings

patches:
- target:
    kind: Ingress
  patch: |
    - op: add
      path: "/metadata/annotations~1nginx.ingress.kubernetes.io~1configuration-snippet"
      value: |
          more_set_headers "Content-Security-Policy: default-src 'none'; connect-src 'self' https://*.gouv.fr; font-src 'self'; img-src 'self'; prefetch-src 'self' https://*.gouv.fr; script-src 'self' https://*.gouv.fr; frame-src 'self' https://*.gouv.fr; style-src 'self' 'unsafe-inline'";
          more_set_headers "X-Frame-Options: deny";
          more_set_headers "X-XSS-Protection: 1; mode=block";
          more_set_headers "X-Content-Type-Options: nosniff";

- target:
    kind: Deployment
  path: patches/kapp-delete-orphan.yaml
- target:
    kind: Service
  path: patches/kapp-delete-orphan.yaml
- target:
    kind: Ingress
  path: patches/kapp-delete-orphan.yaml

# - target:
#     kind: Service
#   path: patches/kapp.yaml
```

If you think you patches can be reused by other project, contribute to [chart/patches](chart/patches) folder of the action by sharing them.

### Test Helm chart generation

#### required:
- helm v3 [install guide](https://helm.sh/docs/intro/install/)
  ```sh
  curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
  ```
- kustomize v4 [install guide](https://kubectl.docs.kubernetes.io/installation/kustomize/binaries/)
  ```sh
  curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh"  | bash
  ```
- node >= 16
- yarn

#### developments on your project, easy test, got to your project directory

```sh
npx kube-workflow b
```

#### developments on kubeworkflow, test with local kube-workflow repository and local project

```sh
# get kube-workflow
export KUBEWORKFLOW_PATH=$PWD/kube-workflow
git clone https://github.com/SocialGouv/kube-workflow $KUBEWORKFLOW_PATH
yarn --cwd $KUBEWORKFLOW_PATH

# get the project repository, here template for example
export WORKSPACE_PATH=$PWD/template
git clone https://github.com/SocialGouv/template $WORKSPACE_PATH

# run manifest generation as snapshots using symlink to tests
REPOSITORY_NAME=$(basename $WORKSPACE_PATH)
ln -s $WORKSPACE_PATH/.kube-workflow $KUBEWORKFLOW_PATH/tests/samples/$REPOSITORY_NAME
cd $KUBEWORKFLOW_PATH
yarn test -t $REPOSITORY_NAME
```

then check content of
- `$KUBEWORKFLOW_PATH/tests/__snapshots__/
    - $REPOSITORY_NAME.dev.yaml
    - $REPOSITORY_NAME.preprod.yaml
    - $REPOSITORY_NAME.prod.yaml

### Development resources

#### helm templates

to enable correct syntax recognition and coloration of yaml helm templates in vscode, enable [Kubenernetes extension](https://marketplace.visualstudio.com/items?itemName=ms-kubernetes-tools.vscode-kubernetes-tools)


Resources:
- [Learn YAML in Y minutes](https://learnxinyminutes.com/docs/yaml/)
- [JSON to YAML](https://www.json2yaml.com/)
- [Kubernetes doc](https://kubernetes.io/docs/concepts/)
- [Helm doc](https://helm.sh/docs/)
- [Kapp doc](https://carvel.dev/kapp/docs/v0.46.0/)


### TODO
#### documentation:
- jobs workflow (needs, shared-storage, action, image, run, shell, uses)
- tests
- best-practices and contributing how-to add
  - charts
  - jobs
  - patches
  - options
  - tests

#### features
- add default runner image with all base tooling for actions

#### repo cycle automation
- build docker image for default runner image
    via itself with jobs/docker-build, et la boucle est bouclée

#### more jobs
- add jobs:
  - docker-build
  - run-workflow (to replace github action)
    triggerable by webhook (need to add webhook as app on argoCD before)

#### more charts
- add charts:
  - an oauth2 proxy service (?)