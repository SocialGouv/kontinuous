# Kontinuous - CI+CD on Kubernetes 🚀

Hey, you work at the marvelous Fabrique Numérique des Ministères Sociaux ?
[Go here for quickstart](#111-fabrique-quickstart)

## Why ?

Was needing a flexible, scalable and independent CI/CD pipelines system running on Kubernetes.

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
    1. [Boilerplate](#11-)
        1. [Fabrique quickstart](#111-fabrique-quickstart)
    2. [Configure repository](#12-)
    3. [Global config](#13-)

2. [Build manifests](#12-)

    1. CLI

    2. Values
  
    3. [Plugins]
        1. [Types]
            1. [repository]
            1. [charts]
            1. [values compilers]
            1. [patches]
            1. [validators]
        2. [Official plugins]
            1. [recommended]
                1. values-compilers
            1. [fabrique]
                1. charts

3. [Deploy](#12-)
    1. CLI
    2. using Github Action
    3. using webhook service
        1. deploy service
            1. using helm
            2. using argocd
        2. configure webhook on repository
            1. Github

4. [Development]
    1. [tests]
    1. [jobs]

5. [Samples]

6. [Links]

# 1. Configuration

## 1.1 Boilerplate

Here is a sample of a boilerplate made for `La Fabrique` and that you can merge with files of your project.

### 1.1.1 Fabrique Quickstart
Run this command in your project to retrieve boilerplate config for kontinuous and corresponding github workflows, then adjust the config in `.kontinuous` folder.

⚠️ Pay attention, this command will overwrite files if same names are used, you should commit you work before running it.
```sh
npx -y tiged SocialGouv/kontinuous/plugins/fabrique/boilerplate --force
```

# 6. Links

- [config](docs/config.md)
- [plugins](docs/plugins/index.md):
    - [import](docs/plugins/import.md)
    - [charts](docs/plugins/charts.md)
    - [values-compilers](docs/plugins/values-compilers.md)
    - [patches](docs/plugins/patches.md)
    - [validators](docs/plugins/validators.md)
- [](docs/.md)


