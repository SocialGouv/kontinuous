const { spawn } = require("child_process")

const { ctx } = require("@modjo-plugins/core")

const parseCommand = require("~common/utils/parse-command")

module.exports = async (manifest, kubecontext) => {
  const logger = ctx.require("logger")
  const [cmd, args] = parseCommand(
    `kubectl --context ${kubecontext} apply -f -`
  )
  try {
    await new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, {
        encoding: "utf-8",
      })
      proc.stdout.on("data", (data) => {
        logger.info(data.toString())
      })
      proc.stderr.on("data", (data) => {
        logger.warn(data.toString())
      })
      proc.on("close", (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`creating job failed with exit code ${code}`))
        }
      })
      proc.stdin.write(JSON.stringify(manifest))
      proc.stdin.end()
    })
  } catch (err) {
    logger.error(err)
    throw err
  }
}
