const { spawn } = require("child_process")

const { ctx } = require("@modjo-plugins/core")

const parseCommand = require("~common/utils/parse-command")

module.exports = async (namespace, name, kubecontext) => {
  const logger = ctx.require("logger")

  const [cmd, args] = parseCommand(
    `kubectl --context ${kubecontext} -n ${namespace} delete jobs.batch ${name}`
  )
  try {
    await new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, {
        encoding: "utf-8",
      })
      proc.stdout.on("data", (data) => {
        logger.info(data.toString())
      })

      let ignoreError
      proc.stderr.on("data", (data) => {
        const message = data.toString()
        if (message.includes("NotFound")) {
          ignoreError = true
        } else {
          logger.warn(message)
        }
      })

      proc.on("close", (code) => {
        if (code === 0 || ignoreError) {
          resolve()
        } else {
          reject(new Error(`deleting job failed with exit code ${code}`))
        }
      })
    })
  } catch (err) {
    console.log("E", err)
    logger.error(err)
    throw err
  }
}
