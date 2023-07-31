# FAQ

[Add your question](https://github.com/SocialGouv/kontinuous/edit/master/docs/faq.md)

## Why another CI/CD ?

We want a flexible, scalable and independent CI+CD framework for kubernetes application with fine grained control over deployment pipelines.

We want a powerful templating system that can handle many use-cases and benefit from HELM ecosystem;

We want a full portable and sef-hostable solution from repositories, to CI/CD.

see [🐉 paradigm](./advanced/paradigm.md) for more detailed explanation.

## Disable some plugin

In your `.kontinuous/config.yaml` :

```yaml
dependencies:
  fabrique:
    somePluginType:
      somePluginName:
        enabled: false
```

See [kontinuous configuration](/advanced/configuration)

## Add custom ingress annotations

NGINX ingress [allows various annotations](https://docs.nginx.com/nginx-ingress-controller/configuration/ingress-resources/advanced-configuration-with-annotations/) : rate-limiting, headers...

To add custom ingress annotations to your app :

```yaml
# .kontinuous/values.yaml

app:
  ingress:
    annotations:
      nginx.ingress.kubernetes.io/proxy-body-size: 512m
      nginx.ingress.kubernetes.io/configuration-snippet: |
        more_set_headers "X-Frame-Options: deny";
        more_set_headers "X-XSS-Protection: 1; mode=block";
```

## Add additionnal build-args on some environment

For example in `.kontinuous/env/prod/values.yaml` :

```yaml
# .kontinuous/values.yaml

jobs:
  runs:
    build-app:
      with:
        buildArgs:
          PRODUCTION: "true"
```

## Create some database

This will create a postgres cluster with an `app` user `app` database. Database secrets will be provisionned in the `pg-xxx-app` secret.

```yaml
# .kontinuous/values.yaml

# create a PG cluster
pg-xxx:
  ~chart: pg
  cnpg-cluster:
    # see https://github.com/SocialGouv/helm-charts/blob/main/charts/cnpg-cluster
    monitoring:
      ~tpl~enablePodMonitor: "true"

app:
  # Wait for DB cluster to be ready
  ~needs: ["pg-xxx"]
  # Attach generated PG credentials to your app
  envFrom:
    - secretRef:
        name: pg-xxx-app
```

## Run a seed job

This example build your Dockerfile, creates a PG cluster, seed the database then starts your application with secrets attached

In your `.kontinuous/values.yaml` or `.kontinuous/[env]/values.yaml`

```yaml
# create app database
pg:
  ~chart: pg

# run app after build and seed
app:
  ~chart: app
  ~needs: [build-app, seed-db]
  # use CNPG db created secret
  envFrom:
    - secretRef:
        name: pg-app

jobs:
  runs:
    # builds Dockerfile
    build-app:
      use: build
    # seed the database
    seed-db:
      use: seed-db
      ~needs: [pg]
      pgSecretName: pg-app
      with:
        seedPath: ./seeds.sql
```

## Add a custom HELM chart

To add a custom HELM chart to your deployment :

Add a `.kontinuous/Chart.yaml` with HELM dependencies:

```yaml
dependencies:
  - name: keycloakx
    repository: https://codecentric.github.io/helm-charts
    version: 2.1.0
    condition: keycloakx.enabled
```

In `.kontinuous/values.yaml` define your HELM values as usual :

```yaml
keycloakx:
  ~needs: ["pg-keycloak"]
  database:
    vendor: postgres
```

## Build and deploy multiple docker images

In `.kontinuous/values.yaml` :

```yaml
app:
  ~chart: app
  ~needs: [build-app, api]
  imagePackage: app

api:
  ~chart: app
  ~needs: [build-api]
  imagePackage: api

jobs:
  ~chart: jobs
  runs:
    build-app:
      use: build
      with:
        imagePackage: app
        context: packages/app
    build-api:
      use: build
      with:
        imagePackage: api
        context: packages/api
```

## Add an oauth2 proxy to protect some application

You can delegate application authentication to [oauth2-proxy](https://oauth2-proxy.github.io/oauth2-proxy) that can connect to multiple identity providers like GitHub, Azure, AD, KeyCloak...

This has many security advantages :

- hides all your application from external users
- delegates all security processes to state-of-the-art providers
- application can receive verifiable user identity

You'll have to disable the default application ingress and replace it with `oauth2-proxy` one then register your application, see [compatible providers](https://oauth2-proxy.github.io/oauth2-proxy/docs/configuration/oauth_provider).

```mermaid
graph LR
Internet["🌍" Internet]-->Proxy["🔒" Proxy]
subgraph Cluster
Proxy-->WebApp["🧑‍💼" WebApp]
Proxy<-->IDP["🔑" Identity providers]
end
```

In `.kontinuous/values.yaml` :

```yaml
# Application to protect
metabase:
  ingress:
    enabled: false # disable ingress (internet exposition)
  # metabase secrets and settings
  envFrom:
    - secretRef:
        name: metabase

oauth2-proxy:
  enabled: true
  # public URL that will show metabase once loggedin
  host: "metabase.myapp.somewhere.fr"
  # internal protected service URL
  upstream: http://metabase
  # oauth2-proxy secrets and settings
  envFrom:
    - secretRef:
        name: oauth2-proxy
  env:
    - name: OAUTH2_PROXY_PROVIDER
      value: github
    - name: OAUTH2_PROXY_GITHUB_ORG
      value: some-org
```

**NOTE** in this example, only users from `some-org` GitHub organisation can access the metabase, but they also have to login on the metabase separately.

## Define a custom docker registry

[TODO]

## Local dev

[TODO]

## Local deployments

[TODO]

## Testing

[TODO]

## Package.json

[TODO]

## Private GIT repo

[TODO]

## 🐰 Easter egg

– I heard about an easter egg hidden in the kontinuous cli, can you give me a clue ?

– Are you kidding me ? Roll up your sleeves and find it, you developer !

[![rabbit-thug](./images/rabbit-thug.png)](https://github.com/SocialGouv/kontinuous/blob/master/packages/kontinuous/src/cli/commands/test.js)
