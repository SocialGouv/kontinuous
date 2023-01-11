# ✨ Features

## ☯️ Core features

- run anywhere
- dependencies tree between jobs and deployment
- on file change switcher (exprerimental)
- patches manifests (using plugins)
- easy hack of manifest using [jq](https://stedolan.github.io/jq/) (using post-renderer)
- validate (using plugins)
- pre-deploy hook (using plugins)
- post-deploy hook (using plugins)
- plugins at repository level
- external plugins from git repo
- nested charts
- external helm charts
  - from helm repository
  - from git repository
- private repository (experimental)
- adaptable to your infra
- meta-values to patches even external charts (eg: using ~needs for dependencies tree)

## ♾️ Plugin's features

See [Plugins details](./advanced/plugins.md)

- values-compilers
  - auto matching on nested charts
  - multiple instances of chart
  - implicit enabled
  - global default values helpers
  - ...
- patches
  - auto set undefined to main namespace
  - auto set rancherProjectId from ci namespace
  - auto hash and truncate too long ingress subdomains with global replacement
  - needs as init containers (deployable with kubectl)
  - needs as kapp annotations (deployable with kaap)
  - ...
- validators
  - validate ingress subdomains compliance
  - verify sealed secret
  - no plain secret
  - resources uniqness
  - ...
- debug-manifests
  - resources tree infos
  - dependencies-tree-infos
  - ...
- pre-deploy plugins
  - ensure rancher namespaces are in active state
  - on demand resource cleaner
  - ...
- post-deploy plugins
  - notify mattermost (coming soon)
  - ...
