const { spawn } = require("child_process")

module.exports = async (
  sidecars,
  _options,
  { config, logger, utils, needBin, manifests, dryRun }
) => {
  if (dryRun) {
    return
  }

  const { needStern, parseCommand } = utils

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

  const promises = []
  for (const ns of namespaces) {
    const kubectlDeployCommand = `
      stern
        ${kubeconfig ? `--kubeconfig ${kubeconfig}` : ""}
        ${kubecontext ? `--context ${kubecontext}` : ""}
        --namespace ${ns}
        --selector ${deploymentLabelKey}=${deploymentLabelValue}
         --color always
    `
    const [cmd, args] = parseCommand(kubectlDeployCommand)

    const proc = spawn(cmd, args, {
      encoding: "utf-8",
      env: {
        ...process.env,
        ...(kubeconfig ? { KUBECONFIG: kubeconfig } : {}),
      },
    })

    proc.stdout.on("data", (data) => {
      process.stdout.write(data.toString())
    })
    proc.stderr.on("data", (data) => {
      process.stdout.write(data.toString())
    })

    sternProcesses.push(proc)
    const promise = new Promise(async (resolve, reject) => {
      proc.on("close", (code) => {
        if (code === 0) {
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

  const promise = Promise.allSettled(promises)

  sidecars.push({ stopSidecar, promise })
}
