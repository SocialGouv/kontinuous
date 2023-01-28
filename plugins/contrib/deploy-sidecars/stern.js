const { spawn } = require("child_process")

const handledKinds = ["Deployment", "StatefulSet", "Job", "DaemonSet"]

module.exports = async (
  options,
  { config, logger, utils, needBin, manifests, dryRun, ctx }
) => {
  if (dryRun) {
    return
  }

  let {
    defaultExcludeContainer = ["kontinuous-wait-needs"],
    excludeContainer = [],
  } = options

  const { defaultLogEnabled = true } = options

  if (!Array.isArray(defaultExcludeContainer)) {
    defaultExcludeContainer = defaultExcludeContainer.split(",")
  }
  if (!Array.isArray(excludeContainer)) {
    excludeContainer = excludeContainer.split(",")
  }

  const allExcludeContainers = [...defaultExcludeContainer, ...excludeContainer]
  const excludeContainerFlag = allExcludeContainers
    .map((containerName) => `--exclude-container=${containerName}`)
    .join(" ")

  const { needStern, parseCommand, promiseAll } = utils

  await needBin(needStern)

  const {
    kubeconfig,
    kubeconfigContext: kubecontext,
    deploymentLabelKey,
  } = config

  const sternProcesses = {}

  const stopSidecar = () => {
    for (const p of Object.values(sternProcesses)) {
      try {
        process.kill(p.pid, "SIGKILL")
      } catch (_err) {
        // do nothing
      }
    }
  }

  const abortSignal = ctx.require("abortSignal")

  const promises = []

  for (const manifest of manifests) {
    let pluginLogEnabled =
      manifest.metadata?.annotations?.["kontinuous/plugin.log"]
    if (pluginLogEnabled === undefined) {
      pluginLogEnabled = defaultLogEnabled
    }
    if (!pluginLogEnabled || pluginLogEnabled === "false") {
      continue
    }

    const { kind } = manifest
    if (!handledKinds.includes(kind)) {
      continue
    }
    const resourceName = manifest.metadata.labels?.["kontinuous/resourceName"]
    const deploymentLabelValue = manifest.metadata?.labels?.[deploymentLabelKey]
    const namespace = manifest.metadata?.namespace

    if (!resourceName) {
      continue
    }

    const labelSelectors = []
    labelSelectors.push(`kontinuous/resourceName=${resourceName}`)
    if (deploymentLabelValue) {
      labelSelectors.push(`${deploymentLabelKey}=${deploymentLabelValue}`)
    }
    const selector = labelSelectors.join(",")

    const sternCmd = `
      stern
        ${kubeconfig ? `--kubeconfig ${kubeconfig}` : ""}
        ${kubecontext ? `--context ${kubecontext}` : ""}
        --namespace ${namespace}
        --selector ${selector}
        --since 1s
        --color always
        ${excludeContainerFlag}
    `

    const [cmd, args] = parseCommand(sternCmd)

    const proc = spawn(cmd, args, {
      encoding: "utf-8",
      env: {
        ...process.env,
        ...(kubeconfig ? { KUBECONFIG: kubeconfig } : {}),
        signal: abortSignal,
      },
    })

    proc.stdout.on("data", (data) => {
      process.stderr.write(data.toString())
    })
    proc.stderr.on("data", (data) => {
      process.stderr.write(data.toString())
    })

    sternProcesses[`${namespace}/${resourceName}`] = proc

    const promise = new Promise(async (resolve, reject) => {
      proc.on("close", (code) => {
        if (code === 0 || code === null) {
          resolve(true)
        } else {
          const error = new Error(`stern exit code ${code}`)
          error.code = code
          logger.trace("error running command")
          reject(error)
        }
      })
    })
    promises.push(promise)
  }

  const eventsBucket = ctx.require("eventsBucket")

  eventsBucket.on("resource:ready", ({ namespace, resourceName }) => {
    const key = `${namespace}/${resourceName}`
    if (sternProcesses[key]) {
      try {
        process.kill(sternProcesses[key].pid, "SIGKILL")
      } catch (_err) {
        // do nothing
      }
    }
  })

  eventsBucket.on("deploy-with:finish", () => {
    stopSidecar()
  })

  return promiseAll(promises)
}
