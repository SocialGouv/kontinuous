# Plugins

**Core**

The core is responsible to merge config, values, templates and process plugins, most of the logic is delegated to plugins. The core is also responsible of tree directory structure creation in temporary folder, yarn install when needed, then helm template calling.

**Plugins**

All custom logic can be implemented in plugins. By creating plugins you can covers all uses cases.

## types

There are differents type of plugins:

- values-compilers: transform user defined values to be consummed by charts
- charts: it's basically all helm charts, you can import from helm repository or declare your own in git repository
- patches: patches applies to final generated kubernetes manifests
- post-renderer: applies to final generated kubernetes manifests after patches, it's like a final super patch, usually used to hack the manifests at project level using dirty bash and jq
- validators: make custom conformity checks on final generated kubernetes manifests
- debug-manifests: used to display various informations extracted from manifests as dependencies tree
- pre-deploy: as it's name indicate, will be run before deploy, it can create pre-requisite resources and wait for state
- deploy-with: plugin as a deployment handler (kapp, kubectl, helm)
- deploy-sidecar: plugin that is running in parallel of deployment handler, used to retrieve logs, fail fast, monitoring some things etc...
- post-deploy: used, for example, to make a report of deployment by sending a message to a third party service
- kontinuous umbrella plugin: you can combine multiples plugins in one repository, or directory inside a repository, using kontinuous umbrella plugins. You can call theses plugins by defining `dependencies` in `.kontinuous/config.yaml` file, calling them with the `import` keyword.

**auto import behavior**

All plugins follow a recursive design pattern, imported umbrella plugins can import another repo (example project import fabrique, fabrique import contrib etc...), all charts can have subcharts, that can have subchart etc..., it the same for values-compilers, patches, validators, debug-manifests, pre-deploy, post-deploy and deploy-sidecar.
When you import recursively there is an arborescence autobuild.
An umbrella plugin contain generally a `kontinuous.yaml` that will contain specific options on sub plugins and sub importeds umbrella plugins, you can ovveride theses in `.kontinuous/config.yaml` at the root of the repository.

**degit**

Remote plugin can be integrated using [`degit`](https://github.com/tiged/tiged) mechanism. You can target full git url on any git plateform, shortcut syntax will default to github. If you use gitlab, there is an addon on `degit` syntax in kontinuous that you can use to target subgroup, putting curly braces arround group name: `https://gitlab.my-orga.com/group/{subgroup-name}/repo/folder/subfolder@ref-branch-or-tag`

**config plugins**

A plugin can be parametred using `enabled` and `options` keys.

The `enabled` key as it's name indicating, allow you to enable or disable a plugins. All plugins are enabled by default, but can be disabled by default at same level as `import` keyword in `kontinuous.yaml` config file.

The `options` key allow you to pass any options that you want to the plugin, and will be consumed by it.

```yaml
projectName: my-project
dependencies:
  fabrique:
    import: socialgouv/kontinuous/plugins/fabrique
    valuesCompilers:
      globalDefaults:
        enabled: true
        options:
          foo: bar
```

You can also add global options, common to your umbrella plugin.

`plugins/fabrique/kontinuous.yaml`

```yaml
dependencies:
  contrib:
    import: socialgouv/kontinuous/plugins/contrib
options:
  domain: "fabrique.social.gouv.fr"
```

The `domain` option will be provided to all plugin as default merge, but you can override at each plugin level:

```yaml
dependencies:
  contrib:
    import: socialgouv/kontinuous/plugins/contrib
    valuesCompilers:
      globalDefaults:
        enabled: true
        options:
          foo: bar
          domain: "override.social.gouv.fr"
options:
  domain: "fabrique.social.gouv.fr"
```

## umbrella

An umbrella plugin is the container for all other plugins types. It's basically a git repository, or subdirectory of a git repository. It can be versioned as a git repo. <br>
A umbrella plugin can import other umbrella plugins, dependencies are recursives. <br>
You can import umbrella plugins from `.kontinuous/config.yaml` in your project and in `kontinous.yaml` in the plugin directory. <br>
You have to name the umbrella from the plugin caller using key. This name will be used for subchart values autolinking. <br>

example:

`$PROJECT_WORKSPACE/.kontinuous/config.yaml`

```yaml
dependencies:
  fabrique:
    import: socialgouv/kontinuous/plugins/fabrique

    valuesCompilers:
      globalDefaults:
        options:
          foo: bar
    patches: {}
    validators: {}
    preDeploy: {}
    postDeploy: {}
    deploySidecars: {}

    dependencies:
      contrib:
        patches:
          reloader:
            enabled: false
        deployWith:
          kapp:
            options:
              kubeApiQps: 1000
              kubeApiBurst: 1000
              waitCheckInterval: 1s
              logsAll: true
```

`socialgouv/plugins/fabrique/kontinuous.yaml`

```yaml
dependencies:
  contrib:
    import: socialgouv/kontinuous/plugins/contrib
```

`$PROJECT_WORKSPACE/.kontinuous/values.yaml`

```yaml
fabrique:
  contrib:
    someChart:
      aValueToBeConsumedByAppSomeChartOfContribPlugin: Hello World !
```

All plugins `charts`, `values-compilers`, `patches`, `validators`, `debug-manifests`, `pre-deploy`, `post-deploy` and `deploy-sidecar` will be autolinked and implicitely applied recursively. You can control order, or optout by creating index.js in each `values-compilers`, `patches`, `validators`, `debug-manifests`, `pre-deploy`, `post-deploy`, `deploy-sidecar` and `deploy-with` directories, then you can include from dependencies plugins yourself. <br>
See [plugins/fabrique/values-compilers/index.js](https://github.com/socialgouv/kontinuous/blob/master/plugins/fabrique/values-compilers/index.js) for example.

You can create and use `charts`, `values-compilers`, `patches`, `validators`, `debug-manifests`, `pre-deploy`, `post-deploy` and `deploy-sidecar` directories in `.kontinuous` at project level in your project path, or in plugin root path. Project level plugins can consume plugins in the same way the plugins can consume other plugins.

You can add a `package.json` and a `yarn.lock` file at root of your kontinuous plugin directory, kontinuous will install it using `yarn` (yes, it's opinionated), so you can use node dependencies in your `values-compilers`, `patches`, `validators`, `debug-manifests`, `pre-deploy`, `post-deploy`, `deploy-sidecar` and `deploy-with` plugins.

## charts

Charts plugin are basically helm charts, that can be autolinked from the umbrella (name for the main chart in helm jargon). <br>
If you doesn't create a `Chart.yaml` in a chart repository, a default on will be created for you by kontinuous. <br>
A parent chart will be automatically created from project/plugin path, charts that are present in the `charts` directory will be automatically added to this chart as subcharts (`dependencies` key in `Chart.yaml`). <br>

## values-compilers

As it's name suggest it, it's values compilers, that will transform values declared in `values.yaml` files in final values that will be consumed by `helm`. <br>
Most often values-compilers are here to make values leaner to declare for final dev user. <br>
Values compilers are pure nodeJS file that have to export commonJS function that will receive values object and has to return values object or undefined. Returned values object will be used if returned, else you can mutate values object directly. <br>
Here are the args that the function will receive: `module.exports = (values, options, { config, utils, ctx, getOptions, getScope }) => values` <br>

- `values` is the values object
- `options` is the options that can be defined at plugin/project level, eg:
  `$PROJECT_WORKSPACE/.kontinuous/values.yaml`
  ```yaml
  dependencies:
    fabrique:
      import: socialgouv/kontinuous/plugins/fabrique
      valuesCompilers:
        globalDefaults:
          options:
            foo: bar
  ```
- `config` is the current [kontinuous config](#_25-variables)
- `utils` is a toolset of helpers function used in kontinuous itself and exposed, all are defined here: [packages/common/utils](https://github.com/socialgouv/kontinuous/blob/master/packages/common/utils)
- `ctx` is the async context dependency injection container of kontinous, it can be used to retrieve config or logger, eg: `logger = ctx.get("logger")`

#### values.js

Instead or additionaly to using a `values.yaml`, you can use a project level only values compiler, that will be runned before all others (bu after retrieving and merging values from `values.yaml` files), creating a values.js file.

#### patches

Patches are pure nodeJS file used to modify final `manifests` after compiled by `helm template`. <br>
Same as `values-compilers` and `validators`, patches has to expose a function using commonJS. This function will receive the kubernetes manifests as an array of object that you can mutate directly or use to produce a new one that you will return. <br>
Here are the args that the function will receive: `module.exports = (values, options, { config, utils, ctx, logger, values, getOptions, getScope }) => values` <br>
See [values-compilers doc for details on arguments](#_44-values-compilers)

NodeJS patches are more flexible than `kustomize` patches that had be abandonned for following reasons:

- https://github.com/kubernetes-sigs/kustomize/issues/947
- https://github.com/kubernetes-sigs/kustomize/issues/1493

If you want to use `kustomize` anyway, the easiest way is to use [`post-renderer`](#_45-bis-post-renderer)

#### post-renderer

Aka _Hack the manifests_

By creating an executable file called `post-renderer` in `.kontinuous` directory at project level, you can declare an helm post-renderer. So you can modify your manifest easily using [`jq`](https://stedolan.github.io/jq/) Eg:

```sh
###!/bin/sh

set -e

### load into variable from standard input
manifest=$(cat)<&0

### arbitrary modify some stuf
manifest=`echo "$manifest" | jq 'map(select(.kind == "Namespace").metadata.labels.foo = "bar")'`

### output
echo "$manifest"
```

Or if you want to use kustomize (not recommended for reasons explained in [patches documentation chapter](#_45-patches))

```sh
###!/bin/sh
manifest=$(cat)<&0
echo "$manifest" > base.yaml
kustomize build .
```

#### validators

Validators are pure nodeJS file used to validate final `manifests` after compiled by `helm template`. <br>
Same as `values-compilers` and `patches`, validators has to expose a function using commonJS. This function will receive the kubernetes manifests as an array of object. <br>
When a manifest contain an invalid definition you have to throw an error this way `throw new Error("error message")`.

Here are the args that the function will receive: `module.exports = (manifests, options, { values, config, utils, ctx, logger, getOptions, getScope }) => {}` <br>
See [values-compilers doc for details on arguments](#_44-values-compilers)

#### 4.7 official plugins

Official plugins are here [plugins/contrib/](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/). They could be put in another git repository, but was kept in main repository for testing purpose.

- **[contrib](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/)**

  - [charts/jobs](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/charts/jobs) <br>
    generic kubernetes jobs chart, used for easily declare CI pipelines from values <br>
    _it require [values-compilers/jobs](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/values-compilers/jobs.js)_

    example `.kontinuous/values.yaml`:

    ```yaml
    hasura:
      needs: [db]

    jobs:
      runs:
        db:
          # use: ./.kontinous/jobs/create-db # local job, defined in project repository
          # use: https://github.com/socialgouv/kontinuous/plugins/contrib/jobs/create-db # degit full url
          use: socialgouv/kontinuous/plugins/contrib/jobs/create-db # degit implicit github
          with:
            pgAdminSecretRefName: pg-scaleway
        seed:
          needs: [hasura]
          use: socialgouv/kontinuous/plugins/contrib/jobs/seed-db
          with:
            seedPath: path/in/repo.sql
    ```

    see [plugins/contrib/jobs/create-db/use.yaml](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/jobs/create-db/use.yaml) for full example.
    All vues from `runs` keys will be interpolated in the job, but you can also uses all parameters directly, except the `with` parameter that is reserved to be used with `use` and inject variable to the called job.

    All others components can declare dependencies on jobs using the `needs` key, and all jobs can declare depencencies on other jobs and other components too, using instances names.

    Mains jobs parameters are:

    - `use` and `with`: to include job definition from elsewhere, usage can be recursive (job can use job, that can use job etc...)
    - `image` the docker image file that will run the job (default is debian for now, in future this will be a generic image with almost all needed tooling)
    - `action` repository (or subfolder in a repository) that will be degitted in mountpoint `/action/` in the job execition
    - `run` a custom command that will override docker image default run, can be a full bash script or just a call to a command
    - `checkout` (default `true`), this enable the degit of the repository at current commit in mountpoint `/workspace/` in the job
    - `if` condition to include the job, can contain variables from values

  - [charts/kontinuous-helpers](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/charts/kontinuous-helpers) <br>
    common helm [library chart](https://helm.sh/docs/topics/library_charts/), contains helpers helm templating snippets that can be reused in any subchart, helping you to keep your charts DRY

  - [patches/namespace](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/patches/namespace.js) <br>
    Add the current kubernetes namespace from [kontinuous config](#_24-variables) to all manifests that doesn't declare explicitly a namespace

  - [patches/dns-truncate](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/patches/dns-truncate.js) <br>
    Truncate and hash all manifests name and ingress domains that is over the max allowed 63 characters.

  - [patches/kapp](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/patches/kapp.js) <br>
    Add `fallback-on-update` and `fallback-on-replace` update and create strategies, and `disable-original` to fix kapp issue [#472](https://github.com/vmware-tanzu/carvel-kapp/issues/472)

  - [validators/dns-limit](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/validators/dns-limit.js) <br>
    Check that all manifests name and ingress domains is not over the max allowed 63 characters. This should never fail if you use [patches/dns-truncate](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/patches/dns-truncate.js).

  - [validators/needs](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/validators/needs.js) <br>
    Check that there is no delcared as required resource that doesn't exists in the manifests.

  - [validators/resources-uniqness](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/validators/resources-uniqness.js) <br>
    Check that there is no duplicate resource name for the same kind.

  - [values-compilers/dash-instances](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/values-compilers/dash-instances.js) <br>
    Compile values key at root level that start with existing chart name, including dependencies chart name, as `${chartName}-arbitrary-instance-name`, to make a chart alias and implement an instance the chart.

    You can declare as many instances as you want of a chart, the name must start with the chart's name suffixed by `-`, eg:

    ```yaml
    app:
      host: ozensemble.fr
      redirectFrom:
        - "{{ .Values.global.host }}"
        - www.ozensemble.fr

    app-2nd-instance:
      probesPath: /healthz
      envFrom:
        - secretRef:
            name: "{{ .Values.global.pgSecretName }}"
        - secretRef:
            name: app-sealed-secret
        - configMapRef:
            name: app-configmap
    ```

    This is an equivalent to adding `~chart` meta-value:

    ```yaml
    app-2nd-instance:
      # ~chart: app # implicit because name starts with app-
    ```

    ```yaml
    arbitrary-chart-instance-name:
      ~chart: app
    ```

  - [values-compilers/unfold-charts](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/values-compilers/unfold-charts.js) <br>
    Refacto the value tree on the fly matching the root level key name with dependencies subcharts names. Example, if you import `fabrique` umbrella plugin in your project: <br>
    `.kontinous/values.yaml`

    ```yaml
    app: {}
    ```

    will be compiled into: <br>

    ```yaml
    fabrique:
      app: {}
    ```

    And if you use `jobs` chart values key of `contrib` plugin that is imported by `fabrique` plugin: <br>
    `.kontinous/values.yaml`

    ```yaml
    jobs: {}
    ```

    will be compiled in: <br>

    ```yaml
    fabrique:
      contrib:
        jobs: {}
    ```

    And so, on helm template compilation run, the values of jobs can be consumed by `jobs` chart, that is a subchart of `contrib`, that is itself a subchart of `fabrique`. FYI helm subcharts are natively recursive.

  - [values-compilers/implicit-enabled](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/values-compilers/implicit-enabled.js) <br>
    Compile declared charts's values to implicit set `enabled` to `true`.

  - [values-compilers/jobs](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/values-compilers/jobs.js) <br>
    Compile jobs simple values to be used by final chart, it includes the downloading of reusable `jobs` (using the `use` keyword) and merging of values from the imported job.

- **[fabrique](https://github.com/socialgouv/kontinuous/blob/master/plugins/fabrique/)**

  - [charts/rancher-namespace](https://github.com/socialgouv/kontinuous/blob/master/plugins/fabrique/charts/rancher-namespace) <br>
    add a namespace configured with provided with rancherProjectId for [rancher](https://rancher.com/) right management. Enabled by default when `chart` kontinuous config is not provided.

  - [charts/security-policies](https://github.com/socialgouv/kontinuous/blob/master/plugins/fabrique/charts/security-policies) <br>
    add some default kube security policies. Enabled by default when `chart` kontinuous config is not provided.

  - [charts/app](https://github.com/socialgouv/kontinuous/blob/master/plugins/fabrique/charts/app) <br>
    Generic chart that can be used to deploy differents apps targeting a docker image, as frontend, backend etc...
  - [charts/hasura](https://github.com/socialgouv/kontinuous/blob/master/plugins/fabrique/charts/hasura) <br>
    deploy an instance of [hasura](https://hasura.io/)

  - [charts/pgweb](https://github.com/socialgouv/kontinuous/blob/master/plugins/fabrique/charts/pgweb) <br>
    deploy an instance of [pgweb](https://github.com/sosedoff/pgweb)

  - [charts/maildev](https://github.com/socialgouv/kontinuous/blob/master/plugins/fabrique/charts/maildev) <br>
    deploy an instance of [maildev](https://github.com/maildev/maildev)

  - [charts/metabase](https://github.com/socialgouv/kontinuous/blob/master/plugins/fabrique/charts/metabase) <br>
    deploy an instance of [metabase](https://www.metabase.com/)

  - [charts/oauth2-proxy](https://github.com/socialgouv/kontinuous/blob/master/plugins/fabrique/charts/oauth2-proxy) <br>
    deploy an instance of [oauth2-proxy](https://github.com/oauth2-proxy/oauth2-proxy)

  - [charts/redis](https://github.com/socialgouv/kontinuous/blob/master/plugins/fabrique/charts/redis) <br>
    deploy an instance of [redis](https://redis.io/)
  - [patches/cert-letsencrypt-issuer](https://github.com/socialgouv/kontinuous/blob/master/plugins/fabrique/patches/cert-letsencrypt-issuer.js) <br>
    add annotation to use `letsencrypt-prod` cluster-issuer using `cert-manager` on `ingress` to prod manifests.

  - [patches/cert-wildcard](https://github.com/socialgouv/kontinuous/blob/master/plugins/fabrique/patches/cert-wildcard.js) <br>
    add label `cert: "wildcard"` on main namespace so `kubed` will copy wildcard cert on dev environment namespaces.

  - [patches/rancher-project-id](https://github.com/socialgouv/kontinuous/blob/master/plugins/fabrique/patches/rancher-project-id.js) <br>
    if namespace containing an empty `field.cattle.io/projectId` annotation, and `ciNamespace` config is defined (usually when `deploy` command is used), it will try to retrieve rancher project id from the `ciNamespace` to fill it.
  - [values-compilers/global-defaults](https://github.com/socialgouv/kontinuous/blob/master/plugins/fabrique/values-compilers/global-defaults.js) <br>
    All defaults values for **_La Fabrique_** are defined here.
    Here is available global values that you can consume in every charts's templates:

    - certSecretName
    - repository
    - repositoryName
    - isDev
    - isProd
    - isPreProd
    - ttl
    - namespace
    - rancherProjectId
    - pgSecretName
    - pgDatabase
    - pgUser
    - host
    - domain
    - registry
    - imageProject
    - imageRepository
    - imageTag
    - branchSlug
    - branchSlug32
    - gitBranch
    - ciNamespace
    - sha
    - shortSha
    - env

  - [jobs/build](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/jobs/build) <br>
    Build `docker` image from project Dockerfile and directory using `kaniko`.

  - [jobs/create-db](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/jobs/create-db) <br>
    Create DB and associated new user for review branches using pg admin user.

  - [jobs/drop-db](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/jobs/drop-db) <br>
    Drop a DB using pg admin user. Can be used before create-db to keep a pristine db on review branch.

  - [jobs/pg-restore](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/jobs/pg-restore) <br>
    Restore a DB from backup using pg_restore.

  - [jobs/psql](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/jobs/psql) <br>
    Run a sql file on DB from project repository.

  - [jobs/seed-db](https://github.com/socialgouv/kontinuous/blob/master/plugins/contrib/jobs/seed-db) <br>
    Run a sql file on DB from project repository using pg secret from target namespace.
