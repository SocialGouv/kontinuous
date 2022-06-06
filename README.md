# Kontinuous - CI+CD on Kubernetes 🚀

Hey, you work at the marvelous Fabrique Numérique des Ministères Sociaux ?
[Go here for quickstart](#111-fabrique-quickstart)

## Why ?

Was needing a flexible, scalable and independent CI+CD system running on Kubernetes with fine grained control over pipelines.

## The approach

**K8S Manifest as pipeline**

All CI+CD pipeline is reproductible running kapp cli deploy command on the built yaml manifest.

**Philosophy**

Keep as close as possible of battle tested and confident tech paradigms as native kubernetes, helm and kapp, so we can use all theirs powers and abilities.


**Tech: (Helm ⛵ + Kapp 🌞) x NodeJS for the customization Kung-Fu 🥷**

- [helm](https://helm.sh/): build manifests from helm templates, so kontinuous is interoperable with the ecosystem of the most popular package manager for kubernetes, and use the only one templating language in go (also used in kubernetes cli)
- [carvel/kapp](https://carvel.dev/kapp/): to deploy ordered pipelines with advanced dependencies declarative system and following deployment state and reconciliation
- the kung-fu: to expose adapted and simplified logic to final dev users, with ready to use values system corresponding to infra, flexible patching system, easy to use plugin charts system etc...

## Documentation

### Summary

1. [Configuration](#1-configuration)
    1. [Boilerplate](#11-boilerplate)
        1. [Fabrique quickstart](#111-fabrique-quickstart)
    2. [Repository config](#12-repository-config)
    3. [Global config](#13-global-config)
    4. [CLI config](#14-cli-config)
    5. [Variables](#15-variables)

2. [Build manifests](#2-build-manifests)

    1. [CLI](#21-cli)

    2. [Values](#22-values)
  
3. [Plugins](#3-plugins)
    1. [types](#31-types)
    2. [repository](#32-repository)
    3. [charts](#33-charts)
    4. [values compilers](#34-values-compilers)
        - 4-bis [values.js](#34-bis-valuesjs)
    5. [patches](#35-patches)
        - 5-bis [post-renderer](#35-bis-post-renderer)
    6. [validators](#36-validators)
    7. [Offical plugins](#37-official-plugins)
    

4. [Samples](#4-samples)

5. [Deploy](#5-deploy)
    1. [CLI](#51-cli)
    2. [Github Action](#52-github-action)
    3. [using webhook service](#53-using-webhook-service)
        1. [deploy service](#531-deploy-service)
            1. [using helm](#5311-using-helm)
            2. [using argocd](#5312-using-argocd)
        2. [configure webhook on repository](#532-configure-webhook-on-repository)
            1. [Github](#5321-github)

6. [Development](#6-development)


7. [Links](#7-links)


# 1. Configuration

## 1.1 Boilerplate

Here is a sample of a boilerplate made for `La Fabrique` and that you can merge with files of your project.

### 1.1.1 Fabrique quickstart

Run this command in your project to retrieve boilerplate config for kontinuous and corresponding github workflows, then adjust the config in `.kontinuous` folder.

⚠️ Pay attention, this command will overwrite files if sames names are used, you should commit your work before running it.
```sh
npx -y tiged SocialGouv/kontinuous/plugins/fabrique/boilerplate --force
```

### 1.2 Repository config

The repository config file path is  `.kontinuous/config.yaml` and this file shoud be commited on the repo. No sensitive data should be included here.

sample for `.kontinuous/config.yaml` :
```yaml
projectName: my-project # default to repository name extracted from git url
dependencies:
  fabrique:
    import: SocialGouv/kontinuous/plugins/fabrique
```

### 1.3 Global config

The global config file path is  `~/.kontinuous/config.yaml` where `~` is your `$HOME` path. You can configure specific environment for your workstation. This file can contain sensitive data as webhook token for projects.

The global config is merged as default config to your project config when running kontinuous.

All keys are same except `projects` and `organizations`:
- Subkeys of `projects` will be merged only when the key match with `projectName`.
- Subkeys of `organizations` will be merged only when the key match with `organization`, than can be defined at project config level or in `projects` of global config, like in the example.


sample for `~/.kontinuous/config.yaml` :
```yaml
links:
  SocialGouv/kontinuous: /lab/fabrique/sre/kontinuous

organizations:
  fabrique:
    webhooks:
        baseDomain: fabrique.social.gouv.fr
        uriPattern: https://webhook-${repositoryName}.${baseDomain}

projects:
  my-project:
    organization: fabrique
    webhook:
      token: "********************************"
```

### 1.4 CLI config

CLI is fully documented, you can consult help using `npx kontinuous --help` to kown all available commands.
Consult help and avaiables options using `--help` on each command, for example to display help from build command run `npx kontinuous build --help`.

### 1.5 Variables

Most of the configuration can be defined in 3 ways:
- config files (global, then by project)
- environment variables (override config file)
- command line options (override environment variables)

For exhaustive description of behavior you can [check the source code](packages/kontinuous/src/cli/load-config.js). <br>
Here are the main (titles are config keys):

- **links** <br>
    Allow you to replace degit path on the fly when using kontinuous plugin system, copying from local folder instead of remote repository.
    sample for `~/.kontinuous/config.yaml` :
    ```yaml
    links:
        SocialGouv/kontinuous: /lab/fabrique/sre/kontinuous
    ```

    In this case, all plugins call starting with `SocialGouv/kontinuous` will be loaded from local `/lab/fabrique/sre/kontinuous`. Usefull for development.

- **workspacePath** <br>
    env: `KS_WORKSPACE_PATH` <br>
    option: `--cwd` <br>
    commands: `build`,`deploy`,`env`,`logs` <br>
    default: current working directory

- **workspaceSubPath** <br>
    env: `KS_WORKSPACE_SUBPATH` <br>
    commands: `build`,`deploy`,`logs` <br>
    default: ".kontinuous"

- **gitRepositoryUrl** <br>
    env: `KS_GIT_REPOSITORY_URL` <br>
    commands: `build`,`deploy` <br>
    default: retrieved from workspace .git

- **gitBranch** <br>
    env: `KS_GIT_BRANCH`,`KS_GIT_REF` <br>
    option: `--branch` <br>
    commands: `build`,`deploy`,`env`,`logs` <br>
    default: retrieved from workspace .git

- **gitSha** <br>
    env: `KS_GIT_SHA` <br>
    option: `--commit` <br>
    commands: `build`,`deploy`,`env`,`logs` <br>
    default: retrieved from workspace .git

- **kontinuousPath** <br>
    env: `KS_KONTINUOUS_PATH` <br>
    commands: `build`,`deploy` <br>
    default: kontinuous package directory

- **chart** <br>
    env: `KS_CHART` <br>
    option: `--chart` <br>
    commands: `build`,`deploy` <br>
    Allow you to disable all charts, except the specified ones. Can be provided as a JSON array or comma separated list.

- **helmArgs** <br>
    env: `KS_HELM_ARGS` <br>
    option: `--helm-args` <br>
    commands: `build`,`deploy` <br>
    Extra args for `helm template` command.

- **inlineValues** <br>
    env: `KS_INLINE_VALUES` <br>
    option: `--inline-values` <br>
    commands: `build`,`deploy` <br>
    Deep override of user provided values (before values-compilers plugins processing).
    sample:
    ```yaml
    a:
      sub:
        key:
          override: newValue
    ```

- **set** <br>
    env: `KS_INLINE_SET` <br>
    option: `--set` <br>
    commands: `build`,`deploy` <br>
    Override values using dot key notation (see [lodash.set method](https://lodash.com/docs/4.17.15#set)). Can be provided as flat yaml/json object from envrionment variable or multiple call to `--set` option (eg: `--set foo=bar --set bar=jo`)
    sample:
    ```yaml
    a.sub.key.override: newValue
    ```

- **buildPath** <br>
    env: `KS_BUILD_PATH` <br>
    commands: `build`,`deploy` <br>
    default: unique temporary directory is created for each command run

- **uploadUrl** <br>
    env: `KS_BUILD_UPLOAD_URL` <br>
    option: `--upload` <br>
    commands: `build`,`deploy` <br>
    Used to upload generated manifests as artifact on the webhook service.

- **statusUrl** <br>
    env: `KS_DEPLOY_STATUS_URL` <br>
    option: `--status-url` <br>
    commands: `build`,`deploy` <br>
    Used to save the status of a pipeline on the webhook service.

- **environment** <br>
    env: `KS_ENVIRONMENT` <br>
    option: `--env, -e` <br>
    commands: `build`,`deploy`,`env`,`logs` <br>
    default: from `gitBranch`: `prod` when on tag matching `v*`, preprod when `master`/`main` branch, `dev` otherwise

- **webhookBaseDomain** <br>
    env: `KS_WEBHOOK_BASE_DOMAIN` <br>
    option: `--webhook-base-domain` <br>
    commands: `deploy`,`logs` <br>
    Not used if `webhookUri` is defined.

- **webhookUriPattern** <br>
    env: `KS_WEBHOOK_URI_PATTERN` <br>
    option: `--webhook-uri-pattern` <br>
    commands: `deploy`,`logs` <br>
    Template for webhook uri. Replaced variables: `${repositoryName}` and `${baseDomain}` (replaced by `webhookBaseDomain`). Not used if `webhookUri` is defined.

- **webhookUri** <br>
    env: `KS_WEBHOOK_URI` <br>
    option: `--webhook-uri` <br>
    commands: `deploy`,`logs` <br>
    default: if `webhookUriPattern` is defined, will use it to generate it replacing `${repositoryName}` and `${baseDomain}` variables.
    The URI to communicate with kontinuous webhook deployed service (it's expected to be a [kontinuous webhook service](packages/webhook/)).

- **ciNamespace** <br>
    env: `KS_CI_NAMESPACE` <br>
    option: `--ci-namespace` <br>
    commands: `build`,`deploy` <br>
    default: `${config.repositoryName}-ci`
    Used to run main pipelines and ci jobs from [`recommended/charts/jobs`](plugins/recommended/charts/jobs/) plugin. Used to retrieve `rancherProjectId` from namespace when not provided when running `deploy` command.

- **rancherProjectId** <br>
    env: `RANCHER_PROJECT_ID` <br>
    option: `--rancher-project-id` <br>
    commands: `build`,`deploy`,`env`,`logs` <br>
    default: retrieved from `ciNamespace` when running `deploy` command.<br>
    Used to create namespace when running `deploy` command and provided as global chart value from plugin [`fabrique/values-compilers/global-defaults`](plugins/fabrique/values-compilers/global-defaults.js) on `build` command.


# 2. Build manifests

## 2.1 CLI

Go into to the repository directory containing `.kontinuous` dir, then run `npx kontinuous build -o`.
You well see the generated manifests.

You can also redirect it to file like this:
```sh
npx kontinuous build -o > manifests.yaml
```

If you want syntaxic coloration in shell:
```sh
npx kontinuous build -so
```


You can debug like this:
```sh
npx kontinuous build -d
```

To see all available options:
```sh
npx kontinuous build --help
```

For development (require helm):
```
git clone https://github.com/SocialGouv/kontinuous.git ~/repos/kontinuous
cd ~/repos/kontinuous
yarn install

cd ~/repos/my-project
~/repos/kontinuous/packages/kontinuous/bin/kontinuous build
```

Obviously you can replace `~/repos/my-project` and `~/repos/kontinuous` by any directory path.


## 3 Plugins


**Core**

The core is responsible to merge config, values, templates and process plugins, most of the logic is delegated to plugins. The core is also responsible of tree directory structure creation in temporary folder, yarn install when needed, then helm template calling.

**Plugins**

All custom logic can be implemented in plugins. By creating plugins you can covers all uses cases. 

## 3.1 types

There are differents type of plugins:
- charts: it's basically all helm charts, you can import from helm repository or declare your own in git repository
- values-compilers: transform user defined values to be consummed by charts
- patches: patches applies to final generated kubernetes manifests
- validators: make custom conformity checks on final generated kubernetes manifests
- import: you can combine multiples plugins in on repository using import plugin
All plugins follow a recursive design pattern, imported `import` plugin can import another repo (example project import fabrique, fabrique import recommended etc...), all charts can have subcharts, that can have subchart etc..., it the same for values-compilers, patches, and validators.
When you import recursively there is an arborescence autobuild.

## 3.2 repository

A repository plugin is the container for all other plugins types. It's basically a git repository, or subdirectory of a git repository. It can be versioned as a git repo. <br>
A repository plugin can import other repository plugin, dependencies are recursives. <br>
You can import repository plugins from `.kontinuous/config.yaml` in your project and in `kontinous.yaml` in the plugin directory. <br>
You have to name the import from the plugin caller using key. This name will be used for subchart values autolinking. <br>

example:

`$PROJECT_WORKSPACE/.kontinuous/config.yaml`
```
dependencies:
  fabrique:
    import: SocialGouv/kontinuous/plugins/fabrique
```

`SocialGouv/plugins/fabrique/kontinuous.yaml`
```yaml
dependencies:
  recommended:
    import: SocialGouv/kontinuous/plugins/recommended
```

`$PROJECT_WORKSPACE/.kontinuous/values.yaml`
```
fabrique:
  recommended:
    some-chart:
      aValueToBeConsumedByAppSomeChartOfRecommendedPlugin: Hello World !
```


`charts`, `values-compilers`, `patches` and `validators` will be autolinked and implicitely applied recursively. You can control order, or optout by creating index.js in each `values-compilers`, `patches` or `validators` directories, then you can include from dependencies plugins yourself. <br>
See [plugins/fabrique/patches/index.js](plugins/fabrique/patches/index.js) for example.

You can create and use `charts`, `values-compilers`, `patches` and `validators` directories in `.kontinuous` at project level in your project path, or in plugin root path. Project level plugins can consume plugins in the same way the plugins can consume other plugins.

You can add a `package.json` and a `yarn.lock` file at root of your kontinuous plugin directory, kontinuous will install it using `yarn`, so you can use node dependencies in your `values-compilers`, `patches` and `validators`.

## 3.3 charts

Charts plugin are basically helm charts, that can be autolinked from the umbrella (name for the main chart in helm jargon). <br>
If you doesn't create a `Chart.yaml` in a chart repository, a default on will be created for you by kontinuous. <br>
A parent chart will be automatically created from project/plugin path, charts that are present in the `charts` directory will be automatically added to this chart as subcharts (`dependencies` key in `Chart.yaml`). <br>


## 3.4 values-compilers

As it's name suggest it, it's values compilers, that will transform values declared in `values.yaml` files in final values that will be consumed by `helm`. <br>
Most often values-compilers are here to make values leaner to declare for final dev user. <br>
Values compilers are pure nodeJS file that have to export commonJS function that will receive values object and has to return values object or undefined. Returned values object will be used if returned, else you can mutate values object directly. <br>
Here are the args that the function will receive: `module.exports = (values, options, { config, utils, ctx }) => values` <br>
- `values` is the values object
- `options` is the options that can be defined at plugin/project level, eg:
    `$PROJECT_WORKSPACE/.kontinuous/values.yaml`
    ```
    dependencies:
      fabrique:
        import: SocialGouv/kontinuous/plugins/fabrique
        values-compilers:
          global-defaults:
            options:
              foo: bar
    ```
- `config` is the current [kontinuous config](#15-variables)
- `utils` is a toolset of helpers function used in kontinuous itself and exposed, all are defined here: [packages/common/utils](packages/common/utils)
- `ctx` is the async context dependency injection container of kontinous, it can be used to retrieve config or logger, eg: `logger = ctx.get("logger")`

## 3.4-bis values.js

Instead or additionaly to using a `values.yaml`, you can use a project level only values compiler, that will be runned before all others (bu after retrieving and merging values from `values.yaml` files), creating a values.js file.


## 3.5 patches

Patches are pure nodeJS file used to modify final `manifests` after compiled by `helm template`. <br>
Same as `values-compilers` and `validators`, patches has to expose a function using commonJS. This function will receive the kubernetes manifests as an array of object that you can mutate directly or use to produce a new one that you will return. <br>
Here are the args that the function will receive: `module.exports = (values, options, { config, utils, ctx, logger, values }) => values` <br>
See [values-compilers doc for details on arguments](#34-values-compilers)


NodeJS patches are more flexible than `kustomize` patches that had be abandonned for following reasons:
- https://github.com/kubernetes-sigs/kustomize/issues/947
- https://github.com/kubernetes-sigs/kustomize/issues/1493
If you want to use `kustomize` anyway, the easiest way is to use [`post-renderer`](#35-bis-post-renderer)


## 3.5-bis post-renderer

By creating an executable file called `post-renderer` in `.kontinuous` directory at project level, you can declare an helm post-renderer. So you can modify your manifest easily using [`jq`](https://stedolan.github.io/jq/) Eg:
```sh
#!/bin/sh

set -e

# load into variable from standard input
manifest=$(cat)<&0

# arbitrary modify some stuf
manifest=`echo "$manifest" | jq 'map(select(.kind == "Namespace").metadata.labels.foo = "bar")'`

# output
echo "$manifest"
```

Or if you want to use kustomize (not recommended for reasons explained in [patches documentation chapter](#35-patches)

```sh
#!/bin/sh
manifest=$(cat)<&0
echo "$manifest" > base.yaml
kustomize build .
```


## 3.6 validators
Validators are pure nodeJS file used to validate final `manifests` after compiled by `helm template`. <br>
Same as `values-compilers` and `patches`, validators has to expose a function using commonJS. This function will receive the kubernetes manifests as an array of object. <br>
When a manifest contain an invalid definition you have to throw an error this way `throw new Error("error message")`.

Here are the args that the function will receive: `module.exports = (manifests, values, options, { config, utils, ctx, logger }) => {}` <br>
See [values-compilers doc for details on arguments](#34-values-compilers)



## 3.7 official plugins

Official plugins are here [plugins/recommended/](plugins/recommended/). They could be put in another git repository, but was kept in main repository for testing purpose.

**[recommended](plugins/recommended/)**
- [charts/jobs](plugins/recommended/charts/jobs) <br>
    generic kubernetes jobs chart, used for easily declare CI pipelines from values <br>
    look at [samples](#4-samples) <br>
    it require [values-compilers/jobs](plugins/recommended/values-compilers/jobs.js)

- [charts/kontinuous-helpers](plugins/recommended/charts/kontinuous-helpers) <br>
    common helm [library chart](https://helm.sh/docs/topics/library_charts/), contains helpers helm templating snippets that can be reused in any subchart, helping you to keep your charts DRY

- [patches/namespace](plugins/recommended/patches/namespace.js) <br>
    Add the current kubernetes namespace from [kontinuous config](#15-variables) to all manifests that doesn't declare explicitly a namespace

- [patches/dns-truncate](plugins/recommended/patches/dns-truncate.js) <br>
    Truncate and hash all manifests name and ingress domains that is over the max allowed 63 characters.

- [patches/kapp](plugins/recommended/patches/kapp.js) <br>

- [validators/dns-limit](plugins/recommended/validators/dns-limit.js) <br>
    Check that all manifests name and ingress domains is not over the max allowed 63 characters. This should never fail if you use [patches/dns-truncate](plugins/recommended/patches/dns-truncate.js).

- [validators/needs](plugins/recommended/validators/needs.js) <br>

- [validators/resources-uniqness](plugins/recommended/validators/resources-uniqness.js) <br>

- [values-compilers/dash-instances](plugins/recommended/values-compilers/dash-instances.js) <br>

- [values-compilers/implicit-enabled](plugins/recommended/values-compilers/implicit-enabled.js) <br>

- [values-compilers/jobs](plugins/recommended/values-compilers/jobs.js) <br>

- [values-compilers/unfold-charts](plugins/recommended/values-compilers/unfold-charts.js) <br>


# 4. Samples


# 5. Deploy


# 6. Development


# 7. Links

## Developers resources

**helm templates**

to enable correct syntax recognition and coloration of yaml helm templates in vscode, enable [Kubernetes extension](https://marketplace.visualstudio.com/items?itemName=ms-kubernetes-tools.vscode-kubernetes-tools)

**learning**:

- [Learn YAML in Y minutes](https://learnxinyminutes.com/docs/yaml/)
- [JSON to YAML](https://www.json2yaml.com/)
- [Kubernetes doc](https://kubernetes.io/docs/concepts/)
- [Helm doc](https://helm.sh/docs/)
- [Kapp doc](https://carvel.dev/kapp/)
