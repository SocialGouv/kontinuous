# Kontinuous configuration

## Repository config

The repository config file path is `.kontinuous/config.yaml` and this file shoud be commited on the repo. No sensitive data should be included here.

sample for `.kontinuous/config.yaml` :

```yaml
projectName: my-project
dependencies:
  fabrique:
    import: socialgouv/kontinuous/plugins/fabrique

    valuesCompilers: {}
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
```

All plugin types, matching to folders naming, are camel-cased. All plugin names, matching to files naming, are camel-cased to and, if prefixed with numbers for simple auto-ordering, the number prefix will be removed. For example, to target the config of `plugins/contrib/values-compilers/06-global-defaults.js`, in case of `contrib` imported via `fabrique` plugin:

```yaml
dependencies:
  fabrique:
    dependencies:
      contrib:
        valuesCompilers:
          globalDefaults:
            enabled: true
            options:
              foo: bar
```

## Global config

The global config file path is `~/.kontinuous/config.yaml` where `~` is your `$HOME` path. You can configure specific environment for your workstation. This file can contain sensitive data as webhook token for projects.

The global config is merged as default config to your project config when running kontinuous.

All keys are same except `projects` and `organizations`:

- Subkeys of `projects` will be merged only when the key match with `projectName`.
- Subkeys of `organizations` will be merged only when the key match with `organization`, than can be defined at project config level or in `projects` of global config, like in the example.

sample for `~/.kontinuous/config.yaml` :

```yaml
links:
  # socialgouv/kontinuous: /home/jo/repositories/kontinuous # this will be configured by default on correct path when using kontinuous from cloned repo or inside docker image instead of npx's cli
  my-orga/my-repo-with-jobs-and-other-kontinuous-plugins: /home/jo/repositories/my-orga/my-repo-with-jobs-and-other-kontinuous-plugins

# organizations:
#   fabrique:

projects:
  my-project:
    # organization: fabrique
    webhookToken: "********************************"
```

## CLI config

CLI is fully documented, you can consult help using `npx kontinuous --help` to kown all available commands.
Consult help and availables options using `--help` on each command, for example to display help from build command run `npx kontinuous build --help`.

## Variables

Most of the configuration can be defined in 3 ways:

- config files (global, then by project)
- environment variables (override config file)
- command line options (override environment variables)

For exhaustive description of behavior you can [check the source code](https://github.com/socialgouv/kontinuous/blob/master/packages/common/config/load-config.js). <br>
