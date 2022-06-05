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
    5. [patches](#35-patches)
    6. [validators](#36-validators)
    7. [Official plugins](#37-official-plugins)
      1. [recommended](#371-recommended)
        1. values-compilers
      1. [fabrique]
        1. charts

4. [Deploy](#12-)
    1. CLI
    2. using Github Action
    3. using webhook service
        1. deploy service
            1. using helm
            2. using argocd
        2. configure webhook on repository
            1. Github

6. [Development]
    1. [tests]
    1. [jobs]

6. [Samples]

7. [Links]

# 1. Configuration

## 1.1 Boilerplate

Here is a sample of a boilerplate made for `La Fabrique` and that you can merge with files of your project.

### 1.1.1 Fabrique Quickstart

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

A repository plugin is the container for all other plugins types. It's basically a git repository, or subdirectory of a git repository. It can be versioned as a git repo.
A repository plugin can import other repository plugin and again, dependencies are recursives.
You can import repository plugins from `.kontinuous/config.yaml` in your project and in `kontinous.yaml` in the plugin directory.
You have to name the import from the plugin caller using key. This name will be used for subchart values autolinking.
Charts, values-compilers, patches and validators will be autolinked and implicitely applied recursively. You can control order, or optout by creating index.js in each values-compilers, patches or validators, then you can include from plugins yourself.

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

## 3.3 


# 6. Links

- [config](docs/config.md)
- [plugins](docs/plugins/index.md):
    - [import](docs/plugins/import.md)
    - [charts](docs/plugins/charts.md)
    - [values-compilers](docs/plugins/values-compilers.md)
    - [patches](docs/plugins/patches.md)
    - [validators](docs/plugins/validators.md)
- [](docs/.md)


