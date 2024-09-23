const async = require("async")

function getNeededSecretNames(manifests) {
  const secretSet = new Set()

  manifests.forEach((manifest) => {
    if (
      ["Deployment", "StatefulSet", "CronJob", "Job", "DaemonSet"].includes(
        manifest.kind
      )
    ) {
      const { spec } = manifest

      // For CronJob, we need to go one level deeper
      const targetSpec =
        manifest.kind === "CronJob" ? spec.jobTemplate.spec : spec

      // Check for secrets in environment variables
      const containers = targetSpec.template.spec.containers || []
      containers.forEach((container) => {
        const envFrom = container.envFrom || []
        envFrom.forEach((env) => {
          if (env.secretRef && env.secretRef.name) {
            secretSet.add(env.secretRef.name)
          }
        })

        const env = container.env || []
        env.forEach((envVar) => {
          if (envVar.valueFrom && envVar.valueFrom.secretKeyRef) {
            secretSet.add(envVar.valueFrom.secretKeyRef.name)
          }
        })
      })

      // Check for secrets in volumes
      const volumes = targetSpec.template.spec.volumes || []
      volumes.forEach((volume) => {
        if (volume.secret && volume.secret.secretName) {
          secretSet.add(volume.secret.secretName)
        }
      })
    }
  })

  return Array.from(secretSet)
}

function filterOutExistingSecrets(manifests, secretNames) {
  const existingSecrets = new Set()

  manifests.forEach((manifest) => {
    if (manifest.kind === "Secret") {
      if (manifest.metadata && manifest.metadata.name) {
        existingSecrets.add(manifest.metadata.name)
      }
    } else if (manifest.kind === "SealedSecret") {
      // SealedSecret uses spec.template.metadata.name
      if (
        manifest.spec &&
        manifest.spec.template &&
        manifest.spec.template.metadata &&
        manifest.spec.template.metadata.name
      ) {
        existingSecrets.add(manifest.spec.template.metadata.name)
      }
    }
  })

  return secretNames.filter((secretName) => !existingSecrets.has(secretName))
}

async function getSecretNamesFromCiNamespace(
  ciNamespace,
  kubectl,
  kubectlOptions
) {
  const names = await kubectl(`get -n ${ciNamespace} secret -oname`, {
    ...kubectlOptions,
    logInfo: false,
    logError: false,
  })
  return names
    .split("\n")
    .map((name) => name.trim().split("/").pop())
    .filter((name) => name)
}

module.exports = async (manifests, options, context) => {
  const { utils, config, logger, kubectl } = context
  const { KontinuousPluginError } = utils

  const { kubeconfig, kubeconfigContext, ciNamespace, environment } = config

  const { surviveOnBrokenCluster = false, applyConcurrencyLimit = 1 } = options

  const allNamespaces = manifests
    .filter((manifest) => manifest.kind === "Namespace")
    .map((manifest) => manifest.metadata.name)

  const kubectlOptions = {
    kubeconfig,
    kubeconfigContext,
    surviveOnBrokenCluster,
  }

  const { copyAllNeeded = false, copyAllFromCiNamespace = false } = options
  let { secrets } = options

  if (copyAllNeeded) {
    const neededSecretNames = getNeededSecretNames(manifests)
    const listedSecretNames = filterOutExistingSecrets(
      manifests,
      neededSecretNames
    )

    secrets = {
      ...listedSecretNames.reduce((acc, name) => ({ ...acc, [name]: {} }), {}),
      ...secrets,
    }
  }

  if (copyAllFromCiNamespace) {
    const listedSecretNames = await getSecretNamesFromCiNamespace(
      ciNamespace,
      kubectl,
      kubectlOptions
    )

    secrets = {
      ...listedSecretNames.reduce((acc, name) => ({ ...acc, [name]: {} }), {}),
      ...secrets,
    }
  }

  const importSecretExec = async (secret) => {
    const {
      key,
      enabled = true,
      toAllNamespace = true,
      reload = false,
      required = false,
    } = secret
    if (!enabled) {
      return
    }
    let { fromNamespace, toNamespace, to, from, env } = secret

    if (env) {
      if (!Array.isArray(env)) {
        env = [env]
      }
      if (!env.includes(environment)) {
        return
      }
    }

    if (!to) {
      to = key
    }
    if (!from) {
      from = key
    }
    if (!Array.isArray(from)) {
      from = [from]
    }

    if (!fromNamespace) {
      fromNamespace = ciNamespace
    }

    if (toAllNamespace) {
      toNamespace = allNamespaces.filter((ns) => {
        if (from === to) {
          return ns !== fromNamespace
        }
        return true
      })
    }

    if (!Array.isArray(toNamespace)) {
      toNamespace = [toNamespace]
    }

    let needed
    if (reload) {
      needed = true
    } else {
      needed = false
      await Promise.all(
        toNamespace.map(async (namespace) => {
          try {
            await kubectl(`get -n ${namespace} secret ${to} -ojson`, {
              ...kubectlOptions,
              logInfo: false,
              logError: false,
            })
          } catch (_err) {
            needed = true
          }
        })
      )
    }

    if (!needed) {
      logger.debug(`✔️  secrets already present "${to}"`)
      return
    }

    let kubeconfigSecretJSON
    for (const fromSecretName of from) {
      try {
        kubeconfigSecretJSON = await kubectl(
          `get -n ${fromNamespace} secret ${fromSecretName} -ojson`,
          { ...kubectlOptions, logInfo: false, logError: false }
        )
        if (kubeconfigSecretJSON) {
          break
        }
      } catch (_err) {
        // do nothing
      }
    }

    if (!kubeconfigSecretJSON) {
      if (required) {
        throw new KontinuousPluginError(
          `missing required secret "${to}" looking for "${from.join(
            '","'
          )}" in namespace "${fromNamespace}"`
        )
      }
      return
    }

    const kubeconfigSecret = JSON.parse(kubeconfigSecretJSON)

    const { metadata } = kubeconfigSecret
    delete metadata.namespace
    delete metadata.resourceVersion
    delete metadata.uid
    delete metadata.creationTimestamp
    delete metadata.ownerReferences
    metadata.name = to

    await Promise.all(
      toNamespace.map(async (namespace) => {
        try {
          await kubectl(`apply -n ${namespace} -f -`, {
            ...kubectlOptions,
            stdin: JSON.stringify(kubeconfigSecret),
          })
        } catch (error) {
          logger.error({ error }, "unable to copy kubeconfig secret")
        }
      })
    )
  }

  const q = async.queue(importSecretExec, applyConcurrencyLimit)

  const importSecret = async (secret) => q.pushAsync(secret)

  await Promise.all(
    Object.entries(secrets).map(([key, secret]) =>
      importSecret({ key, ...(secret || {}) })
    )
  )
}
