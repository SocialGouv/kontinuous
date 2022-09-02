const { spawn } = require("child_process")

const globalLogger = require("./logger")
const parseCommand = require("./parse-command")

const promiseFromChildProcess = (child, callback, logger, extraOptions) => {
  const { ignoreErrors = [] } = extraOptions
  const out = []
  child.stdout.on("data", (data) => {
    out.push(data)
  })
  const err = []
  child.stderr.on("data", (data) => {
    if (ignoreErrors.some((errCatch) => data.includes(errCatch))) {
      return
    }
    err.push(data)
  })
  return new Promise(async (resolve, reject) => {
    if (callback) {
      await callback(child)
    }
    child.on("close", (code) => {
      if (code === 0) {
        if (err.length > 0) {
          logger.trace(err.join())
        }
        resolve(Buffer.concat(out).toString())
      } else {
        const error = new Error(err.join())
        error.code = code
        logger.trace("error running command")
        reject(error)
      }
    })
  })
}

module.exports = (
  arg,
  options = {},
  callback = null,
  logger = globalLogger,
  extraOptions = {}
) => {
  const [cmd, args] = parseCommand(arg)
  const defaultOptions = { encoding: "utf-8" }
  const childProcess = spawn(cmd, args, { ...defaultOptions, ...options })
  return promiseFromChildProcess(
    childProcess,
    callback,
    logger.child({ cmd, args }),
    extraOptions
  )
}
