const { spawn } = require("child_process")

const signals = ["SIGTERM", "SIGHUP", "SIGINT"]

module.exports = async (
  deploys,
  _options,
  { config, logger, utils, manifestsFile, dryRun }
) => {
  const { parseCommand } = utils

  const { kubeconfigContext, kubeconfig } = config

  const helmDeployCommand = dryRun
    ? "kubectl version"
    : `
        kubectl apply
          ${kubeconfigContext ? `--kube-context ${kubeconfigContext}` : ""}
          -f ${manifestsFile}
          --force
      `

  const [cmd, args] = parseCommand(helmDeployCommand)

  const proc = spawn(cmd, args, {
    encoding: "utf-8",
    env: {
      ...process.env,
      ...(kubeconfig ? { KUBECONFIG: kubeconfig } : {}),
    },
  })

  for (const signal of signals) {
    process.on(signal, () => {
      proc.kill(signal)
      process.exit(0)
    })
  }

  proc.stdout.on("data", (data) => {
    process.stdout.write(data.toString())
  })
  proc.stderr.on("data", (data) => {
    logger.warn(data.toString())
  })

  const promise = new Promise((resolve, reject) => {
    proc.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`kubectl deploy failed with exit code ${code}`))
      }
    })
  })

  deploys.push({ promise, process: proc })
}
