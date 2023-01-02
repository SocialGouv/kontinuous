# FAQ

[Add your question](https://github.com/SocialGouv/kontinuous/issues/new?title=docs:%20add%20FAQ%20entry)

## Why another CI/CD ?

We want a flexible, scalable and independent CI+CD framework for kubernetes application with fine grained control over deployment pipelines.

We want a powerful templating system that can handle many use-cases and benefit from HELM ecosystem;

We want a full portable and sef-hostable solution from repositories, to CI/CD.

## Define a custom docker registry

[TODO]

## Disable some plugin

In your `.kontinuous/config.yaml` :

```yaml
dependencies:
  fabrique:
    somPlugin:
      enabled: false
```

See [kontinuous configuration](/advanced/configuration)

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
