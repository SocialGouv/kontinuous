const { spawn } = require("child_process")

const ctx = require("~common/ctx")
const parseCommand = require("~common/utils/parse-command")
const needKapp = require("~common/utils/need-kapp")
const slug = require("~common/utils/slug")

const needBin = require("~/bin/need-bin")

const signals = ["SIGTERM", "SIGHUP", "SIGINT"]

module.exports = async ({
  options,
  kubeconfigContext,
  manifestsFile,
  kubeconfig,
  repositoryName,
}) => {
  const logger = ctx.require("logger")
  const config = ctx.require("config")

  const charts = config.chart?.join(",")

  const kappApp = slug(
    `${repositoryName}-${config.gitBranch}${charts ? `-${charts}` : ""}`
  )

  const kappWaitTimeout =
    options.timeout || process.env.KS_DEPLOY_TIMEOUT || "15m0s"

  await needBin(needKapp)

  const [cmd, args] = parseCommand(`
        kapp deploy
          ${
            kubeconfigContext ? `--kubeconfig-context ${kubeconfigContext}` : ""
          }
          --app label:kontinuous/kapp=${kappApp}
          --logs-all
          --wait-timeout ${kappWaitTimeout}
          --dangerous-override-ownership-of-existing-resources
          --yes
          -f ${manifestsFile}
      `)

  try {
    await new Promise((resolve, reject) => {
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
      proc.on("close", (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`kapp deploy failed with exit code ${code}`))
        }
      })
    })
  } catch (err) {
    logger.error(err)
    throw err
  }
}
