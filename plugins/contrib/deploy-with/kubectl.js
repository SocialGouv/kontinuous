const { spawn } = require("child_process")

const signals = ["SIGTERM", "SIGHUP", "SIGINT"]

const rolloutStatus = require("../lib/rollout-status")

module.exports = async (deploys, options, context) => {
  const { config, logger, utils, manifestsFile, dryRun } = context

  const { parseCommand } = utils

  const { kubeconfigContext, kubeconfig, deployTimeout } = config

  let validate
  if (validate === undefined || validate === null || validate === "") {
    if (config.noValidate) {
      validate = false
    } else {
      validate = true
    }
  }

  const kubectlDeployCommand = `
    kubectl apply
      ${kubeconfigContext ? `--context ${kubeconfigContext}` : ""}
      -f ${manifestsFile}
      ${
        dryRun
          ? "--dry-run=none"
          : `
      --force`
      }
      --validate=${validate ? "true" : "false"}
      --overwrite
      --wait
      --timeout=${deployTimeout}
  `

  const [cmd, args] = parseCommand(kubectlDeployCommand)

  const kubectlProc = spawn(cmd, args, {
    encoding: "utf-8",
    env: {
      ...process.env,
      ...(kubeconfig ? { KUBECONFIG: kubeconfig } : {}),
    },
  })

  let stopRolloutStatus

  for (const signal of signals) {
    process.on(signal, () => {
      kubectlProc.kill(signal)
      if (stopRolloutStatus) {
        stopRolloutStatus()
      }
      process.exit(0)
    })
  }

  kubectlProc.stdout.on("data", (data) => {
    process.stdout.write(data.toString())
  })
  kubectlProc.stderr.on("data", (data) => {
    logger.warn(data.toString())
  })

  const kubectlPromise = new Promise((resolve, reject) => {
    kubectlProc.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`kubectl deploy failed with exit code ${code}`))
      }
    })
  })

  const promise = new Promise(async (resolve, reject) => {
    try {
      await kubectlPromise
      if (!dryRun) {
        const { stop, promise: rolloutStatusPromise } = await rolloutStatus(
          context
        )
        stopRolloutStatus = stop
        await rolloutStatusPromise
      }
      resolve(true)
    } catch (err) {
      reject(err)
    }
  })

  const stopDeploy = async () => {
    try {
      process.kill(kubectlProc.pid, "SIGKILL")
    } catch (_err) {
      // do nothing
    }
    if (stopRolloutStatus) {
      stopRolloutStatus()
    }
  }

  deploys.push({ promise, stopDeploy })
}
