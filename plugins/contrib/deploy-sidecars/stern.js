// const { setTimeout } = require("timers/promises")

module.exports = async (
  sidecars,
  _options,
  { config, logger, utils, needBin, manifests, dryRun }
) => {
  if (dryRun) {
    return
  }

  const { needStern, asyncShell } = utils

  await needBin(needStern)

  const {
    kubeconfig,
    kubeconfigContext: kubecontext,
    deploymentLabelKey,
    deploymentLabelValue,
  } = config

  const sternProcesses = []
  const stopSidecar = async () => {
    for (const p of sternProcesses) {
      process.kill(p.pid, "SIGKILL")
    }
  }

  const namespaces = new Set()
  for (const m of manifests) {
    const ns = m.metadata?.namespace
    if (ns) {
      namespaces.add(ns)
    }
  }

  const promises = [...namespaces].map((ns) =>
    asyncShell(
      `
      stern
        --kubeconfig ${kubeconfig}
        --context ${kubecontext}
        --namespace ${ns}
        --selector ${deploymentLabelKey}=${deploymentLabelValue}
    `,
      {
        callback: (proc) => {
          sternProcesses.push(proc)
          proc.stdout.on("data", (data) => {
            // logger.debug(data.toString())
            process.stdout.write(data.toString())
          })
          proc.stderr.on("data", (data) => {
            logger.warn(data.toString())
          })
        },
      }
    )
  )

  const promise = Promise.all(promises)

  sidecars.push({ stopSidecar, promise })
}
