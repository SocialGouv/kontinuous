const { spawn } = require("child_process")

const ctx = require("~common/ctx")
const parseCommand = require("~common/utils/parse-command")
const needKapp = require("~common/utils/need-kapp")
const slug = require("~common/utils/slug")

const needBin = require("~/bin/need-bin")

const signals = ["SIGTERM", "SIGHUP", "SIGINT"]

module.exports = async ({ manifestsFile, dryRun }) => {
  const logger = ctx.require("logger")
  const config = ctx.require("config")

  const { kubeconfigContext, kubeconfig, repositoryName, deployTimeout } =
    config

  const charts = config.chart?.join(",")

  const kappApp = slug(
    `${repositoryName}-${config.gitBranch}${charts ? `-${charts}` : ""}`
  )

  await needBin(needKapp)

  const kappDeployCommand = dryRun
    ? "kapp --version"
    : `
        kapp deploy
          ${
            kubeconfigContext ? `--kubeconfig-context ${kubeconfigContext}` : ""
          }
          --app label:kontinuous/kapp=${kappApp}
          --logs-all
          --wait-timeout ${deployTimeout}
          --dangerous-override-ownership-of-existing-resources
          --diff-changes=true
          --yes
          -f ${manifestsFile}
      `

  const [cmd, args] = parseCommand(kappDeployCommand)

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
        reject(new Error(`kapp deploy failed with exit code ${code}`))
      }
    })
  })

  return { promise, process: proc }
}
