# Kontinuous - CI on Kubernetes 🚀

## Why ?

Was needing a flexible, scalable and independent CI/CD pipeline running on Kubernetes.

## The approach

### Helm + Kapp + some NodeJS Kung-Fu

- Helm: to be interoperable with it's mostly adopted ecosystem
- Kapp: to deploy in order and follow deployment state
- some customization kung-fu: to expose adapted and simplified logic to final dev users, with ready to use values system corresponding to our infra

### Core

The `core` is responsible to merge config, values, templates and process plugins, most of the logic is delegated to plugins. The core is also responsible of tree directory structure creation in temporary folder, yarn install when needed, then helm template calling.

### Plugins

All custom logic can be implemented in plugins. By creating plugins you can covers all uses cases. There are differents type of plugins:
- charts: it's basically all helm charts, you can import from helm repository or declare your own in git repository
- values-compilers: transform user defined values to be consummed by charts
- patches: patches applies to final generated kubernetes manifests
- validators: make custom conformity checks on final generated kubernetes manifests
- import: you can combine multiples plugins in on repository using import plugin
All plugins follow a recursive design pattern, imported `import` plugin can import another repo (example project import fabrique, fabrique import recommended etc...), all charts can have subcharts, that can have subchart etc..., it the same for values-compilers, patches, and validators.
When you import recursively there is an arborescence autobuild.

## Documentation

### Summary

1. [Configuration](#1-configuration)
    1. [Configure repository](#12-)
    2. [Global config](#12-)

2. [Build manifests](#12-)

  1. [Plugins]
      1. [repository]
      1. [charts]
      1. [values compilers]
      1. [patches]
      1. [validators]

3. [Deploy](#12-)

4. [Webhook](#12-)

5. [Github Action]
    1. [Deploy]
    1. [Logs (webhook)]


6. [Official plugins]
    1. [recommended]
        1. values-compilers
    1. [fabrique]
        1. charts

7. [Development]
    1. [tests]
    1. [jobs]

8. [Links]


### 8. Links

- [config](docs/config.md)
- [plugins](docs/plugins/index.md):
    - [import](docs/plugins/import.md)
    - [charts](docs/plugins/charts.md)
    - [values-compilers](docs/plugins/values-compilers.md)
    - [patches](docs/plugins/patches.md)
    - [validators](docs/plugins/validators.md)
- [](docs/.md)



