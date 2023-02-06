const async = require("async")

module.exports = async ({ manifests, options, context, callback }) => {
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

  const { secrets } = options

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

    let secretJSON
    for (const fromSecretName of from) {
      try {
        secretJSON = await kubectl(
          `get -n ${fromNamespace} secret ${fromSecretName} -ojson`,
          { ...kubectlOptions, logInfo: false, logError: false }
        )
        if (secretJSON) {
          break
        }
      } catch (_err) {
        // do nothing
      }
    }

    if (!secretJSON) {
      if (required) {
        throw new KontinuousPluginError(
          `missing required secret "${to}" looking for "${from.join(
            '","'
          )}" in namespace "${fromNamespace}"`
        )
      }
      return
    }

    const kubeSecret = JSON.parse(secretJSON)

    const { metadata } = kubeSecret
    delete metadata.namespace
    delete metadata.resourceVersion
    delete metadata.uid
    delete metadata.creationTimestamp
    delete metadata.ownerReferences
    metadata.name = to

    await Promise.all(
      toNamespace.map(async (namespace) =>
        callback({ secret: kubeSecret, namespace, kubectlOptions })
      )
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
