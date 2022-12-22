# Getting started

## With kontinuous you can:

- 📦 Define applications resources definitions and their dependencies in GIT
- 🚧 Use builtin jobs for common use cases : docker builds, database creation/seed...
- 🌍 Deploy on many environments : review-branches, preprod, prod...
- 🔐 Use GitHub, GitLab or your own machine to build and deploy; no vendor-lockin

kontinuous is built ontop of [HELM](https://helm.sh/), it's modular and plugin-based so you can extend it at will.

## kontinuous CLI

The CLI is fully documented, you can consult help using `npx kontinuous --help` to known all available commands. Consult help and availables options using `--help` on each command.

With `npx kontinuous init` you can bootstrap a new `.kontinuous` folder that will hold your application and environments definitions.

The `.kontinuous/values.yaml` is where you define your applications components, and they can be overriden in `.kontinuous/${env}/values.yaml`.

Every yaml file in `.kontinuous/templates` and `.kontinuous/${env}/templates` will be merged with the final manifests.

You'll find a detailed documentation below and plenty of examples in our [samples](https://github.com/socialgouv/kontinuous/packages/kontinuous/tests/samples).

## Directory structure

```raw
.kontinuous
├─ config.yaml # kontinuous config, install and configure plugins
├─ values.yaml # common values passed to charts
├─ templates (optional) # common kubernetes resources defined as helm templates, can consume veriables defined in values
│   └─ * # any yaml file that you put here will be included in manifests
├─ env (optional)
│   ├─ dev
│   │   ├─ values.yaml # values override for dev environment
│   │   └─ templates # kubernetes resources specific for dev environment
│   │       └─ * # any yaml file that you put here will be included in manifests
│   ├─ preprod
│   │   ├─ # same as dev, but for preprod :)
│   │   └─ # if you have common templates with dev you can make relative symlink targeting dev resources to avoid repetition
│   ├─ prod
│   │   └─ # same as dev and preprod, but for prod :)
│   └─ local
│       └─ # same as dev and preprod and prod, but for local cluster, if you have a kubernetes cluster on your laptop :)
└─ charts (optional)
    └─ name-of-chart # you can override values for this chart in root values.yaml at key `name-of-chart`
        ├─ values.yaml # default values for the chart
        ├─ templates # same as before
        ├─ env # same as before
        └─ charts # if you have subcharts, you can nest infinitely
```

## Build

Run `npx kontinuous build -o` to see your manifests YAML and `npx kontinuous build -o | kubectl apply` to deploy to your cluster.

See [build documentation](./advanced/build.md)

## Environments

Environment can be provided using `KS_ENVIRONMENT` environment variable, `--env` option, or is autoselected from `.git`.

Env related `values.yaml` and templates directories will be merged from `.kontinuous/env/${env}`.

When no explicit env is provided, kontinuous use the GIT head to select the correct environment

| Branche or tag | environnement |
| -------------- | ------------- |
| master, main   | preprod       |
| v\*.\*         | prod          |
| \*             | dev           |

## Requirements

[TODO]: on the cluster

Minimal dependencies:

- Git repository (public or private)
- Kubernetes
  - giving the kubeconfig to kontinuous to access the project scope
  - a dedicated ci namespace per project and per cluster containing all needed secrets (optional)

## Advanced

Detailed documention:

- [lifecycle](./advanced/lifecycle.md)
- [features](./advanced/features.md)
- [kontinuous configuration](./advanced/configuration.md)
- [kontinuous build](./advanced/build.md)
- [kontinuous deploy](./advanced/deploy.md)
- [plugin system](./advanced/plugins.md)
- [Webhook](./advanced/webhook.md)

## Samples projects

There are many sample here [packages/kontinuous/tests/samples](https://github.com/socialgouv/kontinuous/blob/master/packages/kontinuous/tests/samples). <br>
Except in case there is a `.kontinuous` file here, the directories are assumed to be the `.kontinuous` dir of projects. The `.env` files are only consumed in tests and will be ignored by kontinuous in real build and deployments.

More samples will be added on demand when feedback for this current documentation will reveal that it's not easy to find and understand how to do a thing. Don't hesitate to ask for enrichment of this section 😉.

## Development

see [CONTRIBUTING.md](./CONTRIBUTING.md)

## Links

### Developers resources

**helm templates**

to enable correct syntax recognition and coloration of yaml helm templates in vscode/[vscodium](https://vscodium.com/), enable [Kubernetes extension](https://marketplace.visualstudio.com/items?itemName=ms-kubernetes-tools.vscode-kubernetes-tools)

**learning**:

- [Learn YAML in Y minutes](https://learnxinyminutes.com/docs/yaml/)
- [Yaml is a superset of json](https://helm.sh/docs/chart_template_guide/yaml_techniques/#yaml-is-a-superset-of-json)
- [JSON to YAML](https://www.json2yaml.com/)
- [Kubernetes doc](https://kubernetes.io/docs/concepts/)
- [Helm doc](https://helm.sh/docs/)
- [Container training](https://container.training/)
- [A visual guide on troubleshooting Kubernetes deployments](https://learnk8s.io/troubleshooting-deployments)

### Related projects

- https://github.com/Praqma/helmsman
- https://dagger.io
- https://github.com/csweichel/werft
- [https://github.com/ligurio/awesome-ci](https://github.com/ligurio/awesome-ci)
- [https://en.wikipedia.org/wiki/Comparison_of_continuous_integration_software](https://en.wikipedia.org/wiki/Comparison_of_continuous_integration_software)
